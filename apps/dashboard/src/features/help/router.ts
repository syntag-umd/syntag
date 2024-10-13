import { createTRPCRouter, userProcedure } from "~/server/trpc/trpc";
import { z } from "zod";
import { env } from "~/env";
import { Prisma } from "@prisma/client";

export const helpRouter = createTRPCRouter({
  submitRequest: userProcedure
    .input(
      z.object({
        problem: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {

      const db_user = await ctx.db.user.findFirst({
        where: { uuid: ctx.auth.sessionClaims.external_id }
        });

      const { problem } = input;
      try {
        const response = await fetch(
          `https://syntag-support.zendesk.com/api/v2/requests.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${env.ZENDESK_MAIL_APIKEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              request: {
                subject: `Help Request submitted by ${db_user?.email ?? "unknown user"}`,
                comment: {
                  body: problem,
                },
                requester: {
                  email: db_user?.email,
                  name: db_user?.name ?? "unknown user",
                },
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json(); // Parse the JSON response
        return { success: true, data };
      } catch (error) {
        console.error("Error submitting help request:", error);
        throw new Error("Failed to submit help request. Please try again later.");
      }
    }),
});
