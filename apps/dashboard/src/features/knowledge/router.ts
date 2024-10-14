import { createTRPCRouter, userProcedure } from "~/server/trpc/trpc";
import { env } from "~/env";
import { getSignedUrl, storage, uploadFileGC } from "~/lib/gc-storage/server";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  type ClientWebsite,
  type ClientFile,
} from "~/app/(dashboard)/documents/types";
import {
  ingestWebsitesSchema,
  ingestFileFormSchema,
  type EnqueueWebsite,
  ingestWebsiteSchema,
} from "./types";
import { canUserEmbed, enqueueWebScrapeTask } from "./utils";
import { deleteKnowledge, ingestDocument } from "./embeddings";
import { type Db } from "~/server/db";

export const addKnowledgeToAssistantInput = z.object({
  assistant_uuid: z.string(),
  knowledge_uuids: z.array(z.string()),
});
export type AddKnowledgeToAssistantInput = z.infer<
  typeof addKnowledgeToAssistantInput
>;
export const deleteInput = z.object({ knowledge_uuid: z.string() });

export const knowledgeRouter = createTRPCRouter({
  ingestFiles: userProcedure
    .input(ingestFileFormSchema)
    .mutation(async ({ input, ctx }) => {
      const externalId = ctx.auth.sessionClaims.external_id;
      const user = await ctx.db.user.findFirstOrThrow({
        where: {
          uuid: externalId,
        },
      });
      if (!canUserEmbed(user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enough embedding tokens",
        });
      }

      const files: File[] = input.files;
      const gcBucket = storage.bucket(env.GC_BUCKET_NAME);
      const user_files = await gcBucket.getFiles({
        prefix: `users/${externalId}/knowledge/files/`,
      });
      let total_size = files.reduce((acc, file) => acc + file.size, 0);

      for (const file of user_files[0]) {
        total_size += file.metadata.size
          ? typeof file.metadata.size == "string"
            ? parseInt(file.metadata.size)
            : file.metadata.size
          : 0;
      }
      if (total_size > 5e9) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Total file size must be less than 5gb",
        });
      }
      const uploadPromises = files.map(async (file) => {
        let newKnowledge = await ctx.db.knowledge.create({
          data: {
            userUuid: user.uuid,
            type: "FILE",
            status: "IN_PROGRESS",
          },
        });

        const filename = `users/${externalId}/knowledge/files/${newKnowledge.uuid}--${file.name}`;
        const uploadGc = await uploadFileGC(env.GC_BUCKET_NAME, filename, file);
        if ("error" in uploadGc) {
          await ctx.db.knowledge.delete({ where: { uuid: newKnowledge.uuid } });

          throw new Error(
            `Failed to upload file to GC: ${JSON.stringify(uploadGc.error)}`,
          );
        }
        newKnowledge = await ctx.db.knowledge.update({
          where: {
            uuid: newKnowledge.uuid,
          },
          data: {
            gcloud_bucket: env.GC_BUCKET_NAME,
            gcloud_name: uploadGc.filename,
            display_name: file.name,
            updatedAt: new Date(),
          },
        });

        try {
          const signed_url = await getSignedUrl(newKnowledge.gcloud_name!);

          await ingestDocument(signed_url, newKnowledge.uuid, user.api_key);
        } catch (err) {
          await ctx.db.knowledge.delete({
            where: {
              uuid: newKnowledge.uuid,
            },
          });
          if (newKnowledge.gcloud_name && newKnowledge.gcloud_bucket) {
            const bucket = storage.bucket(newKnowledge.gcloud_bucket);
            const file = bucket.file(newKnowledge.gcloud_name);
            await file.delete().catch();
          }
          console.error("Error uploading file", err);
          throw err;
        }

        await ctx.db.knowledge.update({
          where: {
            uuid: newKnowledge.uuid,
          },
          data: {
            status: "READY",
            updatedAt: new Date(),
          },
        });
        return { knowledge_uuid: newKnowledge.uuid };
      });

      const uploaded_files = await Promise.all(uploadPromises);

      return uploaded_files;
    }),
  ingestWebsite: userProcedure
    .input(ingestWebsiteSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirstOrThrow({
        where: {
          uuid: ctx.auth.sessionClaims.external_id,
        },
      });
      if (!canUserEmbed(user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enough embedding tokens",
        });
      }
      const enqueue: EnqueueWebsite = {
        userUuid: ctx.auth.sessionClaims.external_id,
        url: input.url,
        originalUrl: input.url,
        crawl: input.crawl,
        assistant_uuid: input.assistant_uuid,
      };
      await enqueueWebScrapeTask(enqueue);

      return await getClientWebsites(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
      );
    }),
  ingestWebsites: userProcedure
    .input(ingestWebsitesSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirstOrThrow({
        where: {
          uuid: ctx.auth.sessionClaims.external_id,
        },
      });
      if (!canUserEmbed(user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enough embedding tokens",
        });
      }

      const enqueues: EnqueueWebsite[] = input.websites.map((item) => ({
        userUuid: ctx.auth.sessionClaims.external_id,
        url: item.url,
        originalUrl: item.url,
        crawl: item.crawl,
        assistant_uuid: input.assistant_uuid,
      }));
      console.log("TRPC enqueues", enqueues);
      await Promise.all(enqueues.map(enqueueWebScrapeTask));
      return await getClientWebsites(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
      );
    }),
  addKnowledgeToAssistant: userProcedure
    .input(addKnowledgeToAssistantInput)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.voice_assistant.findFirstOrThrow({
        where: {
          uuid: input.assistant_uuid,
          userUuid: ctx.auth.sessionClaims.external_id,
        },
      });

      const promises = input.knowledge_uuids.map(async (knowledge_uuid) => {
        try {
          await ctx.db.knowledge.findFirstOrThrow({
            where: {
              uuid: knowledge_uuid,
              userUuid: ctx.auth.sessionClaims.external_id,
            },
          });

          await ctx.db.assistants_to_knowledge.create({
            data: {
              voice_assistant_uuid: input.assistant_uuid,
              knowledge_uuid: knowledge_uuid,
            },
          });
        } catch (e) {
          console.error("Failed to associate assistant with knowledge ", e);
        }
      });
      await Promise.all(promises);
    }),
  /**Gets the documents for "memory" */
  getClientDocuments: userProcedure.query(async ({ ctx }) => {
    return await getClientDocuments(ctx.db, ctx.auth.sessionClaims.external_id);
  }),
  getClientWebsites: userProcedure.query(async ({ ctx }) => {
    return await getClientWebsites(ctx.db, ctx.auth.sessionClaims.external_id);
  }),
  deleteWebsite: userProcedure
    .input(deleteInput)
    .mutation(async ({ input, ctx }) => {
      const user_p = ctx.db.user.findFirstOrThrow({
        where: {
          uuid: ctx.auth.sessionClaims.external_id,
        },
      });
      const knowledge = await ctx.db.knowledge.findFirstOrThrow({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          uuid: input.knowledge_uuid,
        },
      });
      const user = await user_p;
      await deleteKnowledge(ctx.db, knowledge, user.api_key);

      return await getClientWebsites(
        ctx.db,
        ctx.auth.sessionClaims.external_id,
      );
    }),
  deleteDocument: userProcedure
    .input(deleteInput)
    .mutation(async ({ input, ctx }) => {
      const user_p = ctx.db.user.findFirstOrThrow({
        where: {
          uuid: ctx.auth.sessionClaims.external_id,
        },
      });
      const knowledge = await ctx.db.knowledge.findFirstOrThrow({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          uuid: input.knowledge_uuid,
        },
      });
      const user = await user_p;
      await deleteKnowledge(ctx.db, knowledge, user.api_key);

      return await getClientDocuments(ctx.db, user.uuid);
    }),
});

export async function getClientDocuments(db: Db, userUuid: string) {
  const userFiles = await db.knowledge.findMany({
    where: {
      userUuid: userUuid,
      type: "FILE",
    },
  });
  const clientFiles: ClientFile[] = userFiles.map((file) => ({
    knowledge_uuid: file.uuid,
    gcloud_name: file.gcloud_name ?? "",
    displayName: file.display_name ?? "File",
  }));
  return clientFiles;
}

async function getClientWebsites(db: Db, userUuid: string) {
  const userWebsites = await db.knowledge.findMany({
    where: {
      userUuid: userUuid,
      type: "WEBSITE",
    },
  });
  const clientWebsites: ClientWebsite[] = userWebsites.map((website) => ({
    knowledge_uuid: website.uuid,
    url: website.url!,
    updatedAt: website.updatedAt,
    status: website.status ?? "FAILED",
    error: website.error ?? undefined,
  }));
  return clientWebsites;
}
