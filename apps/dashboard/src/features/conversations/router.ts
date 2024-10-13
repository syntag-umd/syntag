import { type Role, type Prisma } from "@syntag/db";
import { type inferProcedureOutput, TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, userProcedure } from "~/server/trpc/trpc";
import { convertStringToKeywords } from "./utils";
import { get } from "http";
import { startOfDay, endOfDay, differenceInDays, subMonths } from "date-fns";

const convoSearchSchema = z.object({
  agent_id: z.string().optional(),
  text: z.string().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  viewed: z.boolean().optional(),
  starred: z.boolean().optional(),
  caller_pn: z.string().optional(),
});
export type ConvoSearch = z.infer<typeof convoSearchSchema>;

export const getConvoExpandedSchema = z.object({ convo_uuid: z.string() });

export const conversationsRouter = createTRPCRouter({
  getConvoExpanded: userProcedure
    .input(getConvoExpandedSchema)
    .query(async ({ ctx, input }) => {
      const convo = await ctx.db.conversation.findFirst({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          uuid: input.convo_uuid,
        },
        orderBy: { createdAt: "desc" },
        include: {
          message: {
            orderBy: [
              { index: { sort: "asc", nulls: "last" } },
              { createdAt: "asc" },
            ],
          },
        },
      });

      return convo;
    }),
  getConvos: userProcedure
    .input(convoSearchSchema)
    .query(async ({ ctx, input }) => {
      const keywords = input.text ? convertStringToKeywords(input.text) : [];
      const keywordConditions = keywords.map((keyword) => {
        return {
          OR: [
            {
              message: {
                some: {
                  content: {
                    contains: keyword,
                    mode: "insensitive" as const,
                  },
                  role: {
                    in: ["USER", "ASSISTANT"] as Role[],
                  },
                },
              },
            },
            {
              summary: {
                contains: keyword,
                mode: "insensitive" as const,
              },
            },
          ],
        };
      });

      const conversations = await ctx.db.conversation.findMany({
        where: {
          AND: [
            { userUuid: ctx.auth.sessionClaims.external_id },
            { voice_assistant_uuid: input.agent_id },
            { createdAt: { gte: input.start_time, lte: input.end_time } },
            { caller_pn: { startsWith: input.caller_pn } },
            { viewed: input.viewed },
            { starred: input.starred },
            ...keywordConditions,
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          uuid: true,
          createdAt: true,
          summary: true,
          medium: true,
          caller_pn: true,
          viewed: true,
          starred: true,
        },
      });
      return conversations;
    }),

  getAllExpanded: userProcedure.query(async ({ ctx }) => {
    const db_user: Prisma.userGetPayload<{
      include: {
        conversation: {
          include: {
            message: true;
          };
        };
      };
    }> | null = await ctx.db.user.findFirst({
      where: { uuid: ctx.auth.sessionClaims.external_id },
      include: {
        conversation: {
          orderBy: { createdAt: "desc" },
          include: {
            message: {
              orderBy: [
                { index: { sort: "asc", nulls: "last" } },
                { createdAt: "asc" },
              ],
            },
          },
        },
      },
    });
    if (!db_user) {
      throw new TRPCError({ message: "No user", code: "BAD_REQUEST" });
    }

    return db_user.conversation;
  }),
  viewConvo: userProcedure
    .input(z.object({ convo_uuid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.conversation
        .update({
          where: {
            uuid: input.convo_uuid,
            userUuid: ctx.auth.sessionClaims.external_id,
          },
          data: {
            viewed: true,
          },
        })
        .catch((e) => {
          console.error("Failed to update of view conversation" + e);
        });

      return true;
    }),
  setStarConvo: userProcedure
    .input(z.object({ convo_uuid: z.string(), starred: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.conversation.update({
        where: {
          uuid: input.convo_uuid,
          userUuid: ctx.auth.sessionClaims.external_id,
        },
        data: {
          starred: input.starred,
        },
      });

      return { starred: input.starred };
    }),
  getConversationDurationSum: userProcedure
    .input(
      z.object({
        agent_id: z.string().optional(), // Optional single agent ID
        agent_ids: z.array(z.string()).optional(), // Optional list of agent IDs
        days_since: z.number().int().positive().optional(), // Optional days since
        startDate: z.date().optional(), // Optional start date as Date type
        endDate: z.date().optional(), // Optional end date as Date type
        includeOnlyPhone: z.boolean().default(true), // Optional boolean parameter, defaults to true
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentDate = new Date();

      // Determine the start and end dates
      let pastDate = new Date(
        currentDate.getTime() - (input.days_since ?? 0) * 24 * 60 * 60 * 1000,
      );
      let endDate = currentDate;

      if (input.startDate) {
        pastDate = input.startDate;
      }

      if (input.endDate) {
        endDate = input.endDate;
      }

      // Build the where clause for agent IDs
      const agentIdFilter = input.agent_id
        ? { voice_assistant_uuid: input.agent_id }
        : input.agent_ids && input.agent_ids.length > 0
          ? { voice_assistant_uuid: { in: input.agent_ids } }
          : {}; // No filter if neither is provided

      // Build the where clause for the medium
      const mediumFilter = input.includeOnlyPhone
        ? { medium: "PHONE" as const }
        : {}; // No filter if includeOnlyPhone is false

      const conversationDurationSum = await ctx.db.conversation.aggregate({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          createdAt: {
            gte: pastDate,
            lte: endDate,
          },
          ...agentIdFilter, // Apply the agent ID filter conditionally
          ...mediumFilter, // Apply the medium filter conditionally
        },
        _sum: {
          durationInSeconds: true,
        },
      });

      return conversationDurationSum._sum.durationInSeconds ?? 0;
    }),

  getConversationDurationAverage: userProcedure
    .input(
      z.object({
        agent_id: z.string().optional(), // Optional single agent ID
        agent_ids: z.array(z.string()).optional(), // Optional list of agent IDs
        days_since: z.number().int().positive().optional(), // Optional days since
        startDate: z.date().optional(), // Optional start date as Date type
        endDate: z.date().optional(), // Optional end date as Date type
        includeOnlyPhone: z.boolean().default(true), // Optional boolean parameter, defaults to true
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentDate = new Date();

      // Determine the start and end dates
      let pastDate = new Date(
        currentDate.getTime() - (input.days_since ?? 0) * 24 * 60 * 60 * 1000,
      );
      let endDate = currentDate;

      if (input.startDate) {
        pastDate = input.startDate;
      }

      if (input.endDate) {
        endDate = input.endDate;
      }

      // Build the where clause for agent IDs
      const agentIdFilter = input.agent_id
        ? { voice_assistant_uuid: input.agent_id }
        : input.agent_ids && input.agent_ids.length > 0
          ? { voice_assistant_uuid: { in: input.agent_ids } }
          : {}; // No filter if neither is provided

      // Build the where clause for the medium
      const mediumFilter = input.includeOnlyPhone
        ? { medium: "PHONE" as const } // Ensure to use the enum value correctly
        : {}; // No filter if includeOnlyPhone is false

      // Calculate the sum and count of durations
      const conversationDurationStats = await ctx.db.conversation.aggregate({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          createdAt: {
            gte: pastDate,
            lte: endDate,
          },
          ...agentIdFilter, // Apply the agent ID filter conditionally
          ...mediumFilter, // Apply the medium filter conditionally
        },
        _sum: {
          durationInSeconds: true,
        },
        _count: {
          id: true, // Assuming `id` is the unique identifier for each conversation
        },
      });

      const totalDuration =
        conversationDurationStats._sum.durationInSeconds ?? 0;
      const count = conversationDurationStats._count.id ?? 0;

      // Calculate the average duration
      const averageDuration = count > 0 ? totalDuration / count : 0;

      return averageDuration;
    }),
  getConversationCount: userProcedure
    .input(
      z.object({
        agent_ids: z.array(z.string()).optional(), // Optional list of agent IDs
        days_since: z.number().int().positive().optional(), // Optional days since
        startDate: z.date().optional(), // Optional start date as Date type
        endDate: z.date().optional(), // Optional end date as Date type
        includeOnlyPhone: z.boolean().default(true), // Optional boolean parameter, defaults to true
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentDate = new Date();

      // Determine the start and end dates
      let pastDate = new Date(
        currentDate.getTime() - (input.days_since ?? 0) * 24 * 60 * 60 * 1000,
      );
      let endDate = currentDate;

      if (input.startDate) {
        pastDate = input.startDate;
      }

      if (input.endDate) {
        endDate = input.endDate;
      }

      // Build the where clause for agent IDs
      const agentIdFilter =
        input.agent_ids && input.agent_ids.length > 0
          ? { voice_assistant_uuid: { in: input.agent_ids } }
          : {}; // No filter if neither is provided

      // Build the where clause for the medium
      const mediumFilter = input.includeOnlyPhone
        ? { medium: "PHONE" as const } // Ensure to use the enum value correctly
        : {}; // No filter if includeOnlyPhone is false

      const conversationCount = await ctx.db.conversation.count({
        where: {
          userUuid: ctx.auth.sessionClaims.external_id,
          createdAt: {
            gte: pastDate,
            lte: endDate,
          },
          ...agentIdFilter, // Apply the agent ID filter conditionally
          ...mediumFilter, // Apply the medium filter conditionally
        },
      });

      return conversationCount;
    }),

  getDailyConversationCounts: userProcedure
    .input(
      z.object({
        agent_ids: z.array(z.string()).optional(), // Optional list of agent IDs
        startDate: z.date().optional(), // Optional start date
        endDate: z.date().optional(), // Optional end date
        includeOnlyPhone: z.boolean().default(true), // Optional boolean parameter, defaults to true
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, includeOnlyPhone } = input;
      let agent_ids = input.agent_ids;
      if (!agent_ids) {
        agent_ids = (
          await ctx.db.voice_assistant.findMany({
            where: {
              userUuid: ctx.auth.sessionClaims.external_id,
            },
            select: {
              uuid: true,
            },
          })
        ).map((va) => va.uuid);
      }

      // Get current date and define a maximum date range (3 months)
      const currentDate = new Date();
      const maxDateRange = subMonths(currentDate, 3);

      // Determine the start and end dates
      let queryStartDate = startDate ? startOfDay(startDate) : maxDateRange;
      const queryEndDate = endDate ? endOfDay(endDate) : currentDate;

      // Ensure the date range does not exceed 3 months
      if (differenceInDays(queryEndDate, queryStartDate) > 90) {
        queryStartDate = new Date(
          startOfDay(queryEndDate).setDate(queryEndDate.getDate() - 90),
        );
      }

      // Initialize an object to store the results
      const result: {
        startDate: Date;
        endDate: Date;
        dailyCounts: Record<string, number[]>;
      } = {
        startDate: queryStartDate,
        endDate: queryEndDate,
        dailyCounts: {},
      };

      for (const agentId of agent_ids) {
        // Build the where clause for medium
        const mediumFilter = includeOnlyPhone
          ? { medium: "PHONE" as const } // Ensure to use the enum value correctly
          : {}; // No filter if includeOnlyPhone is false

        // Fetch daily conversation counts for the current agent
        const dailyCounts = await ctx.db.conversation.groupBy({
          by: ["createdAt"],
          where: {
            voice_assistant_uuid: agentId,
            userUuid: ctx.auth.sessionClaims.external_id,
            createdAt: {
              gte: queryStartDate,
              lte: queryEndDate,
            },
            ...mediumFilter, // Apply the medium filter conditionally
          },
          _count: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        // Initialize array for the current agent with zeros for each day in range
        const daysInRange = differenceInDays(queryEndDate, queryStartDate) + 1;
        const counts = new Array(daysInRange).fill(0);

        // Fill in the counts based on fetched data
        dailyCounts.forEach(({ createdAt, _count }) => {
          const dayIndex = differenceInDays(
            startOfDay(createdAt),
            queryStartDate,
          );
          counts[dayIndex] += _count.createdAt; // Accumulate counts for the same day
        });

        // Store the counts array in the result map with agentId as the key
        result.dailyCounts[agentId] = counts;
      }

      return result;
    }),
});
export type ConvosResponse = inferProcedureOutput<
  (typeof conversationsRouter)["getConvos"]
>;

export type ConversationResponse = inferProcedureOutput<
  (typeof conversationsRouter)["getConvoExpanded"]
>;
