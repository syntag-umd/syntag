import { type Db } from "~/server/db";
import { deletePhoneNumber } from "../phone-numbers/server_utils";
import { deleteAssistant } from "../agents/server_utils";
import {
  deleteKnowledge,
  deleteNamespacePinecone,
} from "../knowledge/embeddings";
import { deleteGCUserFiles } from "~/lib/gc-storage/server";
import { clerkClient } from "@clerk/nextjs/server";
import { stripe } from "../billing/stripe";

export async function deleteUser(db: Db, clerk_id: string) {
  const dbUser = await db.user.findUnique({
    where: { clerk_id },
    select: {
      uuid: true,
      api_key: true,
      stripe_customer_id: true,
      voice_assistant: { select: { uuid: true, id: true } },
      phone_number: { select: { uuid: true } },
      knowledge: true,
    },
  });
  if (!dbUser) {
    throw new Error("User does not exist");
  }
  try {
    //Does this first to unlink phone number from agent
    await Promise.all(
      dbUser.phone_number.map((phone_number) => {
        return deletePhoneNumber(
          { phone_number_uuid: phone_number.uuid },
          dbUser.uuid,
          db,
        );
      }),
    );

    const deleteAgentPromises: Promise<any>[] = [];
    void dbUser.voice_assistant.forEach((assistant) => {
      deleteAgentPromises.push(
        deleteAssistant(
          db.voice_assistant,
          db.assistants_to_knowledge,
          assistant.uuid,
          dbUser.uuid,
        ),
      );
    });

    const deleteKnowledgePromises = dbUser.knowledge.map(async (knowledge) => {
      await deleteKnowledge(db, knowledge, dbUser.api_key);
    });

    await Promise.all([...deleteAgentPromises, ...deleteKnowledgePromises]);
    void deleteNamespacePinecone(dbUser.api_key);
    void deleteGCUserFiles(dbUser.uuid);

    await db.$transaction(
      async (tx) => {
        if (dbUser.stripe_customer_id) {
          await stripe.customers.del(dbUser.stripe_customer_id).catch((e) => {
            console.error("Caught: Failed to delete stripe customer: ", e);
          });
        }

        await tx.user.delete({
          where: { clerk_id },
        });

        await clerkClient.users.deleteUser(clerk_id).catch((e) => {
          console.error("Caught: Failed to delete clerk user: ", e);
        });
      },
      { isolationLevel: "Serializable" },
    );
    return true;
  } catch (error) {
    console.error("Caught error with account deletion: ", error);
    throw new Error(String(error));
  }
}
