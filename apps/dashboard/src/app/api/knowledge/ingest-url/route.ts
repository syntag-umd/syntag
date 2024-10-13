import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
  deleteEmbeddedDocument,
  ingestDocument,
} from "~/features/knowledge/embeddings";
import {
  type EnqueueWebsite,
  formattedUrlSchema,
  receiveWebsiteSchema,
} from "~/features/knowledge/types";
import {
  canUserEmbed,
  enqueueWebScrapeTask,
  SYNTAG_ADMIN_KEY_HEADER,
  urlToMarkdown,
} from "~/features/knowledge/utils";
import { getSignedUrl, storage } from "~/lib/gc-storage/server";
import { constantTimeCompare } from "~/lib/utils";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
// Vercel configuration
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const reqAdminKey = req.headers.get(SYNTAG_ADMIN_KEY_HEADER);
  if (!reqAdminKey || !constantTimeCompare(reqAdminKey, env.SYNTAG_ADMIN_KEY)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const {
    data: input,
    success,
    error,
  } = receiveWebsiteSchema.safeParse(await req.json());
  if (!success) {
    return NextResponse.json(error, { status: 400 });
  }

  const dbKnowledge = await db.knowledge.findFirst({
    where: {
      userUuid: input.userUuid,
      uuid: input.knowledge_uuid,
    },
    include: {
      user: { select: { api_key: true, embedding_tokens: true } },
    },
  });

  if (!dbKnowledge) {
    console.error("Knowledge not found", input);
    throw new TRPCError({
      message: "Knowledge not found",
      code: "NOT_FOUND",
    });
  }
  if (!canUserEmbed(dbKnowledge.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not enough embedding tokens",
    });
  }
  if (dbKnowledge.type !== "WEBSITE" || !dbKnowledge.url) {
    console.error("Knowledge is not a website", dbKnowledge);
    throw new TRPCError({
      message: "Knowledge is not a website",
      code: "BAD_REQUEST",
    });
  }
  console.log("Ingesting-url", dbKnowledge.url);
  let should_delete;
  try {
    should_delete = dbKnowledge.status !== "ENQUEUE";

    await db.knowledge.update({
      where: {
        uuid: dbKnowledge.uuid,
      },
      data: {
        status: "IN_PROGRESS",
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(
      "Caught error ingesting-url route preparing: ",
      error,
      input,
      dbKnowledge,
    );
    await db.knowledge.update({
      where: {
        uuid: dbKnowledge.uuid,
      },
      data: {
        status: "FAILED",
        error: "Failed to setup",
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "Failed to setup" }, { status: 500 });
  }
  let readerData;
  try {
    readerData = await urlToMarkdown(dbKnowledge.url).catch((e) => {
      console.error("urlToMarkdown error", e);
      throw e;
    });
    const bucket = storage.bucket(env.GC_BUCKET_NAME);
    const filename = `users/${input.userUuid}/knowledge/urls/${dbKnowledge.uuid}.txt`;
    const file = bucket.file(filename);
    await file.save(readerData.content).catch((e) => {
      console.error("Failed to save file", e);
      throw e;
    });

    const file_url = await getSignedUrl(filename).catch((e) => {
      console.error("Failed to get signed url", e);
      throw e;
    });

    if (should_delete) {
      await deleteEmbeddedDocument(dbKnowledge.uuid, dbKnowledge.user.api_key);
    }

    await ingestDocument(file_url, dbKnowledge.uuid, dbKnowledge.user.api_key);

    await db.knowledge.update({
      where: {
        uuid: dbKnowledge.uuid,
      },
      data: {
        status: "READY",
        gcloud_bucket: env.GC_BUCKET_NAME,
        gcloud_name: filename,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(
      "Caught error ingesting-url route ingesting: ",
      error,
      input,
      dbKnowledge,
    );
    await db.knowledge.update({
      where: {
        uuid: dbKnowledge.uuid,
      },
      data: {
        status: "FAILED",
        error: "Failed to get url",
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "Failed to get url" }, { status: 500 });
  }

  if (input.assistant_uuid) {
    try {
      const va = await db.voice_assistant.findFirst({
        where: {
          uuid: input.assistant_uuid,
          userUuid: input.userUuid,
        },
      });
      if (!va) {
        throw new Error("Assistant not found");
      }
      await db.assistants_to_knowledge.create({
        data: {
          voice_assistant_uuid: input.assistant_uuid,
          knowledge_uuid: dbKnowledge.uuid,
        },
      });
    } catch (e) {
      //TODO this is probably from the record already existing
      console.error(
        "Failed to associate assistant with knowledge ",
        JSON.stringify(e),
      );
    }
  }

  if (input.crawl) {
    const links = Object.entries(readerData.links).map(([key, value]) => {
      return value;
    });

    const formattedLinks = links.filter((link) => {
      const { data: formattedLink, success } =
        formattedUrlSchema.safeParse(link);
      if (!success) {
        return false;
      }
      if (!formattedLink.startsWith(input.originalUrl)) {
        return false;
      }
      return true;
    });

    const dedupLinks = [...new Set(formattedLinks)];

    for (const link of dedupLinks) {
      const body: EnqueueWebsite = {
        url: link,
        crawl: true,
        userUuid: input.userUuid,
        originalUrl: input.originalUrl,
        assistant_uuid: input.assistant_uuid,
      };
      void enqueueWebScrapeTask(body);
    }
  }
  console.log("Finished ingesting-url", input, dbKnowledge.url);
  return new NextResponse();
}
