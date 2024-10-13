import { clerkClient } from "@clerk/nextjs/server";
import { createStripeCustomer } from "~/features/billing/stripe";
import {
  createTRPCRouter,
  protectedProcedure,
  userProcedure,
} from "~/server/trpc/trpc";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { PhoneNumberBilling } from "../phone-numbers/billing";
import { deleteUser } from "./utils";

const changeOnboardingStageInput = z.object({
  onboarding_stage: z.number().nullable(),
});
export type ChangeOnboardingStageInput = z.infer<
  typeof changeOnboardingStageInput
>;

export const userRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const clerk_id = ctx.auth.userId;
    const dbUser = await ctx.db.user.findUnique({
      where: { clerk_id },
    });
    if (dbUser) {
      throw new Error("User already exists");
    }
    let newDbUser;
    try {
      const clerkUser = await clerkClient.users.getUser(clerk_id);
      newDbUser = await ctx.db.$transaction(
        async (db) => {
          const apiKey = uuidv4();
          let user = await db.user.create({
            data: {
              clerk_id,
              name: clerkUser.fullName ?? "",
              api_key: apiKey,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              pn: clerkUser.primaryPhoneNumber?.phoneNumber,
              embedding_tokens: 1e7,
              phone_number_balance: 1,
              account_balance: 8,
            },
          });
          await clerkClient.users.updateUser(clerk_id, {
            externalId: user.uuid,
          });

          const stripe_customer = await createStripeCustomer(
            user.uuid,
            user.email ?? undefined,
            user.name,
            user.pn ?? undefined,
          );
          void PhoneNumberBilling.init(stripe_customer.id);

          user = await db.user.update({
            where: { clerk_id: clerk_id, uuid: user.uuid },
            data: { stripe_customer_id: stripe_customer.id },
          });
          return user;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      /**Because of React Strict Mode this tRPC gets called twice.
       * Two transactions will start, but because of the Serializable isolation level,
       * one gets the lock at user.create, and the second one waits.
       * When first one finishes, it unlock, and then the second one tries to create the user.
       * That causes the unique constraint on clerk_id column and the following error.
       * -Ideally this would be idempotent, but not spending time implementing when there's no issue.
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const target = error.meta?.target as undefined | string[];
        if (error.code === "P2002" && target?.includes("clerk_id")) {
          return await ctx.db.user.findUnique({
            where: { clerk_id: clerk_id },
          });
        }
      }
      throw error;
    }

    return newDbUser;
  }),
  get: protectedProcedure.query(async ({ ctx }) => {
    const clerk_id = ctx.auth.userId;
    const user = await ctx.db.user.findUnique({
      where: { clerk_id },
    });
    return user;
  }),
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const clerk_id = ctx.auth.userId;
    return await deleteUser(ctx.db, clerk_id);
  }),
  changeOnboardingStage: userProcedure
    .input(changeOnboardingStageInput)
    .mutation(async ({ ctx, input }) => {
      const user_uuid = ctx.auth.sessionClaims.external_id;
      const updatedUser = await ctx.db.user.update({
        where: { uuid: user_uuid },
        data: { onboarding_stage: input.onboarding_stage },
      });
      return updatedUser;
    }),
});
