import { env } from "~/env";
import { type Db } from "~/server/db";
import { Prisma } from "@syntag/db";
import { type DeletePhoneNumberInput } from "./router";
import { TRPCError } from "@trpc/server";
import { client } from "./twilio/server";
import { PhoneNumberBilling } from "./billing";

export async function linkPhoneNumberToAssistant(
  db: Db,
  userUuid: string,
  phone_number_uuid: string,
  voice_assistant_uuid: string,
) {
  // prisma throws error if not found
  const db_phone_number = await db
    .$transaction(
      async (tx) => {
        const db_phone_number = await tx.phone_number.update({
          where: {
            uuid: phone_number_uuid,
            userUuid: userUuid,
            OR: [
              { voice_assistant_uuid: null },
              { voice_assistant_uuid: { not: voice_assistant_uuid } },
            ],
          },
          data: { voice_assistant_uuid: voice_assistant_uuid },
          include: { voice_assistant: true },
        });

        if (!db_phone_number.voice_assistant) {
          throw new Error("No voice assistant connected to phone number");
        }
        if (!db_phone_number.vapi_phone_number_id) {
          throw new Error("Phone number is not connected to vapi");
        }
        if (!db_phone_number.voice_assistant.vapi_assistant_id) {
          throw new Error(
            "Voice assistant is not connected to a vapi assistant",
          );
        }

        return db_phone_number;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    )
    .catch((e) => {
      console.error(e);
      throw e;
    });
  return db_phone_number;
}

export async function unlinkPhoneNumberFromAssistant(
  db: Db,
  userUuid: string,
  phone_number_uuid: string,
  voice_assistant_uuid: string,
) {
  const db_phone_number = await db.phone_number.findFirst({
    where: {
      uuid: phone_number_uuid,
      userUuid: userUuid,
      voice_assistant_uuid: voice_assistant_uuid,
    },
    include: { voice_assistant: true },
  });
  if (!db_phone_number) {
    throw new Error("Phone number not found");
  }
  if (!db_phone_number.voice_assistant) {
    throw new Error("No voice assistant connected to phone number");
  }
  if (!db_phone_number.vapi_phone_number_id) {
    throw new Error("Phone number is not connected to vapi");
  }
  if (!db_phone_number.voice_assistant.vapi_assistant_id) {
    throw new Error("Voice assistant is not connected to a vapi assistant");
  }

  const updated_phone_number = await db.phone_number.update({
    where: { uuid: phone_number_uuid, userUuid: userUuid },
    data: { voice_assistant_uuid: null },
    include: { voice_assistant: true },
  });
  return updated_phone_number;
}

export async function deletePhoneNumber(
  input: DeletePhoneNumberInput,
  userUuid: string,
  db: Db,
) {
  //make sure it is their phone number they are deleting
  const dbPhoneNumber = await db.phone_number.findFirst({
    where: {
      userUuid: userUuid,
      OR: [{ uuid: input.phone_number_uuid }, { pn: input.pn }],
    },
    include: {
      user: true,
    },
  });
  if (
    !dbPhoneNumber ||
    !dbPhoneNumber.user.stripe_customer_id ||
    !dbPhoneNumber.pn
  ) {
    throw new TRPCError({ message: "No number", code: "BAD_REQUEST" });
  }
  if (dbPhoneNumber.voice_assistant_uuid) {
    await unlinkPhoneNumberFromAssistant(
      db,
      userUuid,
      dbPhoneNumber.uuid,
      dbPhoneNumber.voice_assistant_uuid,
    );
  }

  if (env.NEXT_PUBLIC_FLAG_LIVE_PHONES === "TRUE") {
    const twilioNumber = (
      await client.incomingPhoneNumbers.list({
        phoneNumber: dbPhoneNumber.pn,
        limit: 1,
      })
    )[0];
    if (!twilioNumber) {
      throw new TRPCError({
        message: "No twilio phonenumber",
        code: "BAD_REQUEST",
      });
    }
    //deletes phone number on twilio
    await client.incomingPhoneNumbers(twilioNumber.sid).remove();
  }

  //deletes phone number billing
  try {
    const subItem = await PhoneNumberBilling.getSubscriptionItem(
      undefined,
      dbPhoneNumber.user.stripe_customer_id,
    ).catch((_) => null);
    if (subItem?.quantity && subItem.quantity > 0) {
      await PhoneNumberBilling.deletePhoneNumber(
        dbPhoneNumber.user.stripe_customer_id,
      );
    } else {
      console.error("No subItems or zero quantity: ", subItem);
    }
  } catch {
    throw new TRPCError({
      message: "Could not delete phone number on stripe",
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  //deletes phone number on vapi
  if (dbPhoneNumber.vapi_phone_number_id) {
    await fetch(
      `https://api.vapi.ai/phone-number/${dbPhoneNumber.vapi_phone_number_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${env.VAPI_API_KEY}`,
        },
      },
    );
  }

  //deletes phone number on database
  const deletedDbNumber = await db.phone_number.delete({
    where: { uuid: dbPhoneNumber.uuid },
  });

  return deletedDbNumber;
}
