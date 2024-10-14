import { PrismaClient } from "@syntag/db";

import { env } from "~/env";
import { EmotionTags } from "~/features/agents/types";

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

export type Db = typeof db;

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
export interface PromptComponents {
  websiteSummary?: string;
  instructions?: string;
  knowledge?: string;
  emotionTags?: EmotionTags;
}

export interface VoiceAssistant {
  prompt_components: PromptComponents;
}
