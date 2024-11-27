 
import { z } from "zod";
import { type inferProcedureOutput, TRPCError } from "@trpc/server";
import { client } from "~/features/phone-numbers/twilio/server";
import { PhoneNumberBilling } from "~/features/phone-numbers/billing";
import { env } from "~/env";
import { createTRPCRouter, userProcedure } from "~/server/trpc/trpc";
import {
  deletePhoneNumber,
  unlinkPhoneNumberFromAssistant,
} from "./server_utils";
import { linkPhoneNumberToAssistant } from "./server_utils";
import { importPhoneNumberToVapi } from "@syntag/vapi/server/api-utils";
import { type IncomingPhoneNumberInstance } from "twilio/lib/rest/api/v2010/account/incomingPhoneNumber";
import { revalidatePath } from "next/cache";
import { withTimeout } from "~/lib/utils";
import { stripe } from "../billing/stripe";

export const getPhoneNumberInput = z
  .object({
    pn: z.string().optional(),
    phone_number_uuid: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.pn && !data.phone_number_uuid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either phone_number or phone_number_uuid must be provided",
      });
    }
  });

export const createPhoneNumberInput = z
  .object({
    areaCode: z.number().optional(),
    contains: z.string().min(2).catch("+1**").optional(),
  })
  .default({});

export const deletePhoneNumberInput = getPhoneNumberInput;
export type DeletePhoneNumberInput = z.infer<typeof deletePhoneNumberInput>;

export const linkAssistantInput = z.object({
  phone_number_uuid: z.string(),
  voice_assistant_uuid: z.string(),
});

export const unlinkAssistantInput = linkAssistantInput;

export const unlinkAndLinkToAssistantInput = z.object({
  voice_assistant_uuid: z.string(),
  current_phone_number_uuid: z.string(),
  new_phone_number_uuid: z.string(),
});

export const phoneNumberRouter = createTRPCRouter({
  /**If no valid stripe subscription, return null */
  get: userProcedure
    .input(getPhoneNumberInput)
    .query(async ({ ctx, input }) => {
      const db_user = await ctx.db.user.findFirst({
        where: { uuid: ctx.auth.sessionClaims.external_id },
      });
      if (!db_user) {
        throw new TRPCError({ message: "No user", code: "BAD_REQUEST" });
      }

      if (
        !(await PhoneNumberBilling.isEntitled(db_user.stripe_customer_id ?? ""))
      ) {
        return null;
      }

      const phone_number = await ctx.db.phone_number.findFirst({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          OR: [{ uuid: input.phone_number_uuid }, { pn: input.pn }],
        },
      });
      if (!phone_number) {
        throw new TRPCError({ message: "No number", code: "BAD_REQUEST" });
      }

      return phone_number;
    }),
  /**If no valid stripe subscription, return null */
  getAll: userProcedure.query(async ({ ctx }) => {
    const db_user = await ctx.db.user.findFirst({
      where: { uuid: ctx.auth.sessionClaims.external_id },
    });
    if (!db_user) {
      throw new TRPCError({ message: "No user", code: "BAD_REQUEST" });
    }

    if (
      !(await PhoneNumberBilling.isEntitled(db_user.stripe_customer_id ?? ""))
    ) {
      return null;
    }
    const phone_numbers = await ctx.db.phone_number.findMany({
      where: {
        userUuid: ctx.auth.sessionClaims.external_id,
      },
      include: {
        voice_assistant: {
          select: {
            name: true,
          },
        },
      },
    });
    phone_numbers.sort((a, b) => {
      if (!a.voice_assistant?.name || !b.voice_assistant?.name) {
        return (
          (b.voice_assistant?.name ? 1 : 0) - (a.voice_assistant?.name ? 1 : 0)
        );
      }
      return a.voice_assistant.name.localeCompare(b.voice_assistant.name);
    });
    return phone_numbers;
  }),
  create: userProcedure
    .input(createPhoneNumberInput)
    .mutation(async ({ ctx, input }) => {
      let dbUser = await ctx.db.user.findFirst({
        where: { uuid: ctx.auth.sessionClaims.external_id },
      });
      if (!dbUser) {
        throw new TRPCError({ message: "No user", code: "BAD_REQUEST" });
      }
      if (!dbUser.stripe_customer_id) {
        throw new TRPCError({
          message: "No stripe account",
          code: "BAD_REQUEST",
        });
      }

      //create phone number on twilio
      let newNumber: IncomingPhoneNumberInstance | { phoneNumber: string };
      const USE_STRIPE = dbUser.phone_number_balance <= 0;

      if (env.NEXT_PUBLIC_FLAG_LIVE_PHONES === "TRUE") {
        const phoneNumbers = await client
          .availablePhoneNumbers("US")
          .local.list({
            areaCode: input.areaCode,
            contains: input.contains,
            limit: 1,
          })
          .catch((e) => {
            console.error(e);
            throw new TRPCError({
              message: "Twilio list phone number: " + e.message,
              code: "INTERNAL_SERVER_ERROR",
            });
          });
        const pn = phoneNumbers[0]?.phoneNumber;

        if (USE_STRIPE) {
          await PhoneNumberBilling.addPhoneNumber(dbUser.stripe_customer_id);
        } else {
          dbUser = await ctx.db.user.update({
            where: { uuid: dbUser.uuid },
            data: {
              phone_number_balance: { decrement: 1 },
            },
          });
        }

        newNumber = await client.incomingPhoneNumbers
          .create({
            phoneNumber: pn,
          })
          .catch(async (e) => {
            if (USE_STRIPE) {
              await stripe.customers
                .createBalanceTransaction(dbUser!.stripe_customer_id!, {
                  amount: -PhoneNumberBilling.PHONE_NUMBER_PRICE,
                  currency: "usd",
                  description: "Refund for failed phone number purchase",
                })
                .catch((e) => {
                  console.error("Failed to refund phone number purchase", e);
                });
            } else {
              dbUser = await ctx.db.user.update({
                where: { uuid: dbUser!.uuid },
                data: {
                  phone_number_balance: { increment: 1 },
                },
              });
            }
            console.error("Failed to purchase twilio number", e);
            throw new TRPCError({
              message: "Twilio create phone number: " + e.message,
              code: "INTERNAL_SERVER_ERROR",
            });
          });
      } else {
        if (USE_STRIPE) {
          await PhoneNumberBilling.addPhoneNumber(dbUser.stripe_customer_id);
        } else {
          dbUser = await ctx.db.user.update({
            where: { uuid: dbUser.uuid },
            data: {
              phone_number_balance: dbUser.phone_number_balance - 1,
            },
          });
        }
        newNumber = { phoneNumber: "+14155552671" };
      }

      //add phone number to database
      const dbPhoneNumber = await ctx.db.phone_number.create({
        data: {
          userUuid: dbUser.uuid,
          pn: newNumber.phoneNumber,
        },
      });
      if (env.NEXT_PUBLIC_FLAG_LIVE_PHONES === "TRUE") {
        await importPhoneNumberToVapi(ctx.db, dbPhoneNumber.uuid);
      }

      return dbPhoneNumber;
    }),
  linkToAssistant: userProcedure
    .input(linkAssistantInput)
    .mutation(async ({ ctx, input }) => {
      const r = await linkPhoneNumberToAssistant(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
        input.phone_number_uuid,
        input.voice_assistant_uuid,
      );
      revalidatePath(`/receptionists/${input.voice_assistant_uuid}`);
      return r;
    }),
  unlinkFromAssistant: userProcedure
    .input(unlinkAssistantInput)
    .mutation(async ({ ctx, input }) => {
      const r = await unlinkPhoneNumberFromAssistant(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
        input.phone_number_uuid,
        input.voice_assistant_uuid,
      );
      revalidatePath(`/receptionists/${input.voice_assistant_uuid}`);
      return r;
    }),
  unlinkAndLinkToAssistant: userProcedure
    .input(unlinkAndLinkToAssistantInput)
    .mutation(async ({ ctx, input }) => {
      await unlinkPhoneNumberFromAssistant(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
        input.current_phone_number_uuid,
        input.voice_assistant_uuid,
      );
      const r = await linkPhoneNumberToAssistant(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
        input.new_phone_number_uuid,
        input.voice_assistant_uuid,
      );
      revalidatePath("/receptionists/[agent_id]");
      return r;
    }),
  delete: userProcedure
    .input(deletePhoneNumberInput)
    .mutation(async ({ ctx, input }) => {
      return deletePhoneNumber(
        input,
        ctx.auth.sessionClaims.external_id,
        ctx.db,
      );
    }),
  listTwilioNumbers: userProcedure
    .input(createPhoneNumberInput)
    .query(async ({ ctx, input }) => {
      try {
        const phoneNumbers = await withTimeout(
          client.availablePhoneNumbers("US").local.list({
            areaCode: input.areaCode,
            contains: input.contains,
            limit: 25,
            voiceEnabled: true,
            smsEnabled: true,
            mmsEnabled: true,
          }),
          5000,
        );
        return phoneNumbers;
      } catch (e) {
        console.error(`Error listing phone ${JSON.stringify(e)}`);
        return [];
      }
    }),
});

export type GetAllPhoneNumberResponse = inferProcedureOutput<
  (typeof phoneNumberRouter)["getAll"]
>;
