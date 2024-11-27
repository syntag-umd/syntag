import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "@clerk/nextjs/server";
import { getActualAuth } from "~/app/(auth)/utils";
import { createTRPCContext } from "../trpc";
import { createCaller } from "../root";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */

// Add authentication
const createContext = cache(async () => {
  // @ts-ignore
  const heads = new Headers(headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
    auth: await getActualAuth(auth()),
  });
});

/* a caller is used when calling on the same api instance. It does not make an http request.
 * Callers still go through trpc middleware, and have the context created. */

export const api = createCaller(createContext);

/* The api2 below is a general client that makes an http request. */

/* import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { customLink, getBaseUrl } from "./shared";
import SuperJSON from "superjson"; */

/* export const api2 = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: getBaseUrl() + "/api/trpc",
      transformer: SuperJSON,
    }),
  ],
}); */
