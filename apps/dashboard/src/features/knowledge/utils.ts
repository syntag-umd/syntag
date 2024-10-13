import { KNOWLEDGE_INGEST_URL_PATH } from "~/app/api/knowledge/ingest-url/types";
import { env } from "~/env";

import { getBaseUrl } from "~/server/trpc/clients/shared";

interface JinaReaderJsonResponse {
  data: {
    content: string;
    title: string;
    url: string;
    links: Record<string, string>;
  };
}

export async function urlToMarkdown(url: string) {
  const res = await fetch("https://r.jina.ai/" + url, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + env.JINA_API_KEY,
      "X-With-Links-Summary": "true",
      Accept: "application/json",
    },
  });
  const reader = (await res.json()) as JinaReaderJsonResponse;
  return reader.data;
}

import { type CloudTasksClient } from "@google-cloud/tasks";
import { getAccessToken } from "~/lib/gc-utils";
import {
  type EnqueueWebsite,
  enqueueWebsiteSchema,
  type ReceiveWebsite,
} from "./types";
import { TRPCError } from "@trpc/server";
import { Db, db } from "~/server/db";
import { user, type knowledge } from "@prisma/client";
export const SYNTAG_ADMIN_KEY_HEADER = "X-Admin-Key";

export async function createWebScrapeTask(receiving_body: ReceiveWebsite) {
  const parent = `projects/${env.GC_PROJECT_ID}/locations/${env.GC_LOCATION}/queues/${env.GC_WEBSCRAPER_QUEUE_NAME}/tasks`;
  const tasks_url = `https://cloudtasks.googleapis.com/v2/${parent}`;

  // used for dedepulication, but this should already be handled
  // const task_name = parent + "/" + receiving_body.knowledge_uuid;
  //console.log("gcloud task", receiving_body);
  const arg: Parameters<CloudTasksClient["createTask"]>[0] = {
    parent: tasks_url,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url: getBaseUrl(true) + KNOWLEDGE_INGEST_URL_PATH,
        body: Buffer.from(JSON.stringify(receiving_body)).toString("base64"),
        headers: {
          "Content-Type": "application/json",
          [SYNTAG_ADMIN_KEY_HEADER]: env.SYNTAG_ADMIN_KEY,
        },
      },
    },
  };

  const accessToken = await getAccessToken();

  const response = await fetch(tasks_url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (response.status >= 400) {
    console.error(
      "Failed to createWebScrapeTask",
      response.statusText,
      await response.text().catch(() => "Can't decode"),
    );
  } else {
    console.log(
      "createWebScrapeTask: Success",
      response.statusText,
      arg.task?.httpRequest?.url,
    );
  }
}

export async function enqueueWebScrapeTask(
  input: EnqueueWebsite,
): Promise<false | knowledge> {
  const { data, success } = enqueueWebsiteSchema.safeParse(input);
  if (!success) {
    console.error("enqueueWebScrapeTask: Failed to parse input", input);
    throw new TRPCError({
      message: "Failed to parse input",
      code: "BAD_REQUEST",
    });
  }
  const { url, userUuid, crawl, originalUrl } = data;
  const getKnowledge = async (db: Db) => {
    let knowledge = await db.knowledge
      .findFirst({
        where: {
          userUuid: userUuid,
          url: url,
        },
      })
      .catch((e) => {
        console.error(`Error to enque ONFIND: ${JSON.stringify(e)}`);
        throw new Error(`Error to enque ONFIND: ${JSON.stringify(e)}`);
      });

    if (knowledge) {
      if (
        knowledge.status === "ENQUEUE" &&
        knowledge.updatedAt.getTime() + 1000 * 60 * 30 > Date.now()
      ) {
        return {
          add_task: false,
          message: `Already enqueued ${(Date.now() - knowledge.updatedAt.getTime()) / 1000} seconds ago`,
        };
      }
      if (knowledge.status === "IN_PROGRESS") {
        return { add_task: false, message: "Already in progress" };
      }
      if (
        knowledge.status === "READY" &&
        knowledge.updatedAt.getTime() + 1000 * 60 * 30 > Date.now()
      ) {
        return {
          add_task: false,
          message: `Already ready ${(Date.now() - knowledge.updatedAt.getTime()) / 1000} ago seconds`,
        };
      }
    } else {
      knowledge = await db.knowledge.create({
        data: {
          userUuid: userUuid,
          type: "WEBSITE",
          url: url,
          status: "ENQUEUE",
        },
      });
    }
    return { add_task: true, knowledge: knowledge };
  };
  const res: { add_task: boolean; message?: string; knowledge?: knowledge } =
    await getKnowledge(db).catch((e) => {
      console.error("Caught enqueueWebScrapeTask getKnowledge", e);
      return { add_task: false, message: "Failed to enqueue transaction" };
      // its getting called multiple times with the same args
      // transactions can fail and it be ok
    });

  if (!res || !res.add_task || !res.knowledge) {
    console.log("Avoided queue: ", res.message);
    return false;
  }

  const task: ReceiveWebsite = {
    userUuid: userUuid,
    originalUrl: originalUrl,
    crawl: crawl,
    knowledge_uuid: res.knowledge.uuid,
    assistant_uuid: input.assistant_uuid,
  };
  try {
    await createWebScrapeTask(task);
    await db.knowledge.update({
      where: {
        uuid: res.knowledge.uuid,
      },
      data: {
        status: "ENQUEUE",
        updatedAt: new Date(),
      },
    });

    return res.knowledge;
  } catch (e) {
    console.error("Failed to enqueueWebScrapeTask", e);
    await db.knowledge.update({
      where: {
        uuid: res.knowledge.uuid,
      },
      data: {
        status: "FAILED",
        updatedAt: new Date(),
        error: "Failed to enqueue",
      },
    });
    return false;
  }
}

export function canUserEmbed(user: Pick<user, "embedding_tokens">) {
  return user.embedding_tokens > 0;
}
