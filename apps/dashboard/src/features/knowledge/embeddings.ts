import { env } from "~/env";
import { fastApiFetch } from "~/requests";
import { Db } from "~/server/db";
import { knowledge, user } from "@syntag/db";
import { storage } from "~/lib/gc-storage/server";
import { TRPCError } from "@trpc/server";
import { getClientDocuments } from "./router";
export async function ingestDocument(
  doc_url: string,
  knowledge_uuid: string,
  user_api_key: string,
) {
  const ingestRes = await fastApiFetch(
    "/embeddings/ingest-document",
    {
      method: "POST",
      body: JSON.stringify({
        doc_url,
        knowledge_uuid,
      }),
    },
    { userApiKey: user_api_key },
  );
  if (ingestRes.status >= 400) {
    throw new Error(
      `Failed to ingest document: ${JSON.stringify(await ingestRes.json())}`,
    );
  }
  return true;
}

export async function deleteNamespacePinecone(user_api_key: string) {
  const deleteRes = await fastApiFetch(
    "/embeddings/offboard",
    {
      method: "POST",
    },
    { userApiKey: user_api_key },
  );
  if (deleteRes.status >= 400) {
    throw new Error(
      `Failed to offboard: ${deleteRes.status} ${JSON.stringify(await deleteRes.json().catch(() => "(couldn't parse json)"))}`,
    );
  }

  return true;
}

export async function deleteEmbeddedDocument(
  knowledge_uuid: string,
  user_api_key: string,
) {
  const deleteRes = await fastApiFetch(
    "/embeddings/delete-document",
    {
      method: "POST",
      body: JSON.stringify({
        knowledge_uuid,
      }),
    },
    { userApiKey: user_api_key },
  );
  if (deleteRes.status >= 400) {
    throw new Error(
      `Failed to delete document: ${deleteRes.status} ${JSON.stringify(await deleteRes.json().catch(() => "(couldn't parse json)"))}`,
    );
  }

  return true;
}

export async function deleteKnowledge(
  db: Db,
  knowledge: knowledge,
  user_api_key: string,
) {
  try {
    await deleteEmbeddedDocument(knowledge.uuid, user_api_key);
    console.log("Deleted embedded document");
  } catch (err) {
    console.error("Failed to delete embedded document", err);
    throw new TRPCError({
      message: "Failed to delete embedded document",
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  const atk_deleted = await db.assistants_to_knowledge.deleteMany({
    where: {
      knowledge_uuid: knowledge.uuid,
    },
  });
  console.log("Deleted assistants to knowledge", atk_deleted);

  await db.knowledge.delete({
    where: { uuid: knowledge.uuid },
  });

  if (knowledge.gcloud_name && knowledge.gcloud_bucket) {
    const bucket = storage.bucket(knowledge.gcloud_bucket);
    const file = bucket.file(knowledge.gcloud_name);
    await file.delete();
  }
}
