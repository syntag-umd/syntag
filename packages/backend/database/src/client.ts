import { PrismaClient } from "@prisma/client";

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db =
  globalForPrisma.prisma ?? (createPrismaClient() as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export * from "@prisma/client";
