import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { env } from "~/env";

import { getActualAuth } from "~/app/(auth)/utils";
import { createTRPCContext } from "~/server/trpc/trpc";
import { appRouter } from "~/server/trpc/root";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
    auth: await getActualAuth(auth()),
  });
};

const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ error, type, path, input, ctx, req }) => {
      console.error(
        `tRPC failed on ${path ?? "<no-path>"}.\nError: ${error.message} ${JSON.stringify(error)}.\n Input: ${JSON.stringify(input)}.\nUser: ${ctx?.auth?.sessionClaims?.external_id ?? "<none>"}`,
      );
    },
  });
};

export { handler as GET, handler as POST };
