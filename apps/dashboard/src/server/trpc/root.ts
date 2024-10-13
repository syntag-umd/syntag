import { createTRPCRouter, createCallerFactory } from "./trpc";
import { type TRPCClientErrorLike } from "@trpc/client";

import { agentRouter } from "~/features/agents/router";
import { userRouter } from "~/features/user/router";
import { phoneNumberRouter } from "~/features/phone-numbers/router";
import { billingRouter } from "~/features/billing/router";
import { conversationsRouter } from "~/features/conversations/router";
import { knowledgeRouter } from "~/features/knowledge/router";
import { helpRouter } from "~/features/help/router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  agent: agentRouter,
  user: userRouter,
  phoneNumber: phoneNumberRouter,
  billing: billingRouter,
  conversations: conversationsRouter,
  knowledge: knowledgeRouter,
  help: helpRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
/**Errors thrown by the tRPC api will of the following type.
 * They will be an instanceof TRPCClientError
 */
export type RouterClientError = TRPCClientErrorLike<AppRouter>;
/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
