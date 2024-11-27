import { type CreateAssistantDTO, type Assistant } from "@vapi-ai/web/api";
import { type Prisma, type voice_assistant } from "@syntag/db";
import { revalidatePath } from "next/cache";
import { env } from "~/env";
import { type inferProcedureOutput, TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createAgentObjectSchema,
  DEFAULT_MODEL,
  getVoiceKeyFromVapiConfig,
  updateAgentObjectSchema,
  type VoiceEnum,
  voicesRecord,
} from "./types";
import {
  getVapiAssistant,
  prepareTransferCallTool,
} from "@syntag/vapi/server/api-utils";
import {
  createTRPCRouter,
  publicProcedure,
  userProcedure,
} from "~/server/trpc/trpc";
import { composeSystemPrompt } from "./model";
import { expandVoiceAssistant, deleteAssistant } from "./server_utils";
import { type JsonObject } from "@prisma/client/runtime/library";
import { type VoiceAssistant } from "~/server/db";

export type VoiceAssistantPhoneKnowledge = Prisma.voice_assistantGetPayload<{
  include: {
    phone_number: true;
    assistants_to_knowledge: { select: { knowledge: true } };
  };
}>;
export const getAgentInput = z.object({ agent_id: z.string() });

export interface DeleteVapiAgentResponse {
  voice_assistant: voice_assistant;
}

export const deleteAgentInput = z.object({
  voice_assistant_uuid: z.string(),
});
export type DeleteAgentInput = z.infer<typeof deleteAgentInput>;

export const agentRouter = createTRPCRouter({
  create: userProcedure
    .input(createAgentObjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { provider, voiceId } = voicesRecord[input.voice].vapiConfig;
      let publicUrl: string | undefined;

      const tools = [];
      if (input.transfer) {
        const transferTool = prepareTransferCallTool(input.transfer);
        tools.push(transferTool);
      }

      const prompt_components: VoiceAssistant["prompt_components"] = {
        instructions: input.instructions,
        knowledge: input.knowledge,
        emotionTags: input.emotionTags,
      };

      const systemPrompt = composeSystemPrompt(prompt_components, input.name);

      const vapi_agent_config: CreateAssistantDTO = {
        voice: {
          provider: provider as "azure",
          voiceId: voiceId,
        },
        firstMessage: input.firstMessage,
        name: input.name,
        // @ts-ignore
        model: {
          messages: systemPrompt,
          model: "gpt-3.5-turbo",
          provider: "custom-llm",
          url: `${env.CUSTOM_LLM_URL}`,
          tools: tools,
        },
        backgroundSound: "off",
        //@ts-ignore this is correct
        serverMessages: ["end-of-call-report"],
        serverUrl: env.NEXT_PUBLIC_FASTAPI_BASE_URL + "/vapi/server-url",
        serverUrlSecret: env.VAPI_SECRET,
        maxDurationSeconds: 1800,
        analysisPlan: {
          summaryPrompt: "",
          successEvaluationPrompt: "",
        },
      };

      const vapi_res = await fetch(`https://api.vapi.ai/assistant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.VAPI_API_KEY}`,
        },
        body: JSON.stringify(vapi_agent_config),
      });
      if (!vapi_res.ok) {
        const error_message = `Error creating vapi agent: ${vapi_res.status} ${vapi_res.statusText} ${JSON.stringify(await vapi_res.json().catch(() => "(could not parse)"))}...`;
        console.error(error_message);
        throw new Error(
          `Error creating vapi agent: ${vapi_res.status} ${vapi_res.statusText}`,
        );
      }
      const vapiAssistant = (await vapi_res.json()) as Assistant;
      const vapi_id = vapiAssistant.id;

      const new_assistant = await ctx.db.voice_assistant.create({
        data: {
          userUuid: ctx.auth.sessionClaims.external_id,
          name: input.name,
          vapi_assistant_id: vapi_id,
          vapi_config: vapiAssistant as unknown as JsonObject,
          prompt_components: prompt_components as JsonObject,
          voice_enum: input.voice,
        },
        include: {
          phone_number: true,
          assistants_to_knowledge: { select: { knowledge: true } },
        },
      });
      const expanded = await expandVoiceAssistant(new_assistant, vapiAssistant);

      revalidatePath("/receptionists", "layout");
      return expanded;
    }),
  getPublic: publicProcedure
    .input(getAgentInput)
    .query(async ({ ctx, input }) => {
      const voice_assistant = await ctx.db.voice_assistant.findFirst({
        where: {
          uuid: input.agent_id,
        },
        select: {
          uuid: true,
          vapi_assistant_id: true,
          name: true,
        },
      });
      if (!voice_assistant) {
        console.error("No assistant found");
        throw new TRPCError({ message: "Not found", code: "BAD_REQUEST" });
      }
      return voice_assistant;
    }),

  get: userProcedure.input(getAgentInput).query(async ({ ctx, input }) => {
    const voice_assistant = await ctx.db.voice_assistant.findFirst({
      where: {
        userUuid: ctx.auth.sessionClaims.external_id,
        uuid: input.agent_id,
      },
      include: {
        phone_number: true,
        assistants_to_knowledge: { select: { knowledge: true } },
      },
    });
    if (!voice_assistant) {
      throw new TRPCError({ message: "No assistant", code: "BAD_REQUEST" });
    }

    return await expandVoiceAssistant(voice_assistant);
  }),
  getAll: userProcedure.query(async ({ ctx }) => {
    const voice_assistants: VoiceAssistantPhoneKnowledge[] =
      await ctx.db.voice_assistant.findMany({
        where: { userUuid: ctx.auth.sessionClaims.external_id },
        include: {
          phone_number: true,
          assistants_to_knowledge: { select: { knowledge: true } },
        },
      });
    const response_promises = [];
    for (const va of voice_assistants) {
      const agent = expandVoiceAssistant(va);
      response_promises.push(agent);
    }
    const responses = await Promise.all(response_promises);
    return responses;
  }),
  getOverview: userProcedure.query(async ({ ctx }) => {
    const agentOverviews = await ctx.db.voice_assistant.findMany({
      where: { userUuid: ctx.auth.sessionClaims.external_id },
      select: {
        uuid: true,
        name: true,
        voice_enum: true,
        vapi_config: true,
        phone_number: true,
      },
    });
    const returns = agentOverviews.map((agent) => {
      const vapiAssistant = agent.vapi_config as unknown as Assistant;
      let voice_id: undefined | string = agent.voice_enum ?? undefined;
      if (vapiAssistant.voice && !voice_id) {
        try {
          voice_id = getVoiceKeyFromVapiConfig({
            provider: vapiAssistant.voice.provider,
            voiceId: vapiAssistant.voice.voiceId,
          });
        } catch (e) {
          console.error("Caught in agent getOverview: ", e);
          voice_id = undefined;
        }
      }
      return {
        uuid: agent.uuid,
        name: agent.name ?? "Unnamed",
        voice_id: voice_id as VoiceEnum,
        pn: agent.phone_number[0]?.pn,
      };
    });
    return returns;
  }),
  delete: userProcedure
    .input(deleteAgentInput)
    .mutation(async ({ ctx, input }) => {
      const deleted_assistant = await ctx.db.$transaction(
        async (tx) => {
          const deleted_assistant = await deleteAssistant(
            tx.voice_assistant,
            tx.assistants_to_knowledge,
            input.voice_assistant_uuid,
            ctx.auth.sessionClaims.external_id,
          );
          return deleted_assistant;
        },
        { isolationLevel: "Serializable", timeout: 10000 },
      );

      revalidatePath("/receptionists", "layout");
      return { voice_assistant: deleted_assistant } as DeleteVapiAgentResponse;
    }),

  update: userProcedure
    .input(updateAgentObjectSchema)
    .mutation(async ({ ctx, input }) => {
      const db_assistant = await ctx.db.voice_assistant.findFirst({
        where: {
          uuid: input.voice_assistant_uuid,
          userUuid: ctx.auth.sessionClaims.external_id,
        },
      });
      if (!db_assistant?.vapi_assistant_id) {
        throw new TRPCError({ message: "No assistant", code: "BAD_REQUEST" });
      }

      if (input.selectedKnowledge) {
        await ctx.db.assistants_to_knowledge.deleteMany({
          where: {
            voice_assistant_uuid: input.voice_assistant_uuid,
          },
        });
        await ctx.db.assistants_to_knowledge.createMany({
          data: input.selectedKnowledge.map((knowledge_uuid) => {
            return {
              voice_assistant_uuid: input.voice_assistant_uuid,
              knowledge_uuid: knowledge_uuid,
            };
          }),
        });
      }

      const vapiAssistant: Assistant =
        Object.keys(db_assistant.vapi_config as JsonObject).length > 0
          ? (db_assistant.vapi_config as unknown as Assistant)
          : await getVapiAssistant(db_assistant.vapi_assistant_id);

      const tools =
        vapiAssistant.model?.tools?.filter((val) => {
          return val.type !== "transferCall";
        }) ?? [];

      if (input.transfer) {
        if (input.transfer.length > 0) {
          const transferTool = prepareTransferCallTool(input.transfer);
          //@ts-ignore
          tools.push(transferTool);
        }
      } else {
        const transferTool = vapiAssistant.model?.tools?.find((val) => {
          return val.type === "transferCall";
        });
        if (transferTool) {
          //@ts-ignore
          tools.push(transferTool);
        }
      }
      const prompt_components =
        db_assistant.prompt_components as VoiceAssistant["prompt_components"];
      if (input.instructions)
        prompt_components.instructions = input.instructions;
      if (input.knowledge) prompt_components.knowledge = input.knowledge;
      if (input.emotionTags) prompt_components.emotionTags = input.emotionTags;
      const systemPrompt = composeSystemPrompt(
        prompt_components,
        input.name ?? db_assistant.name ?? "",
      );
      const vapi_agent_config: CreateAssistantDTO = {
        firstMessage: input.firstMessage,
        name: input.name,
        // @ts-ignore
        model: {
          messages: systemPrompt,
          model: "gpt-3.5-turbo",
          provider: "custom-llm",
          url: `${env.CUSTOM_LLM_URL}`,
          tools: tools,
        },
        backgroundSound: "off",
        modelOutputInMessagesEnabled: true,
        maxDurationSeconds: 1800,
        serverUrl: env.NEXT_PUBLIC_FASTAPI_BASE_URL + "/vapi/server-url",
        serverUrlSecret: env.VAPI_SECRET,
        analysisPlan: {
          summaryPrompt: "",
          successEvaluationPrompt: "",
        },
      };

      if (input.voice) {
        vapi_agent_config.voice = voicesRecord[input.voice].vapiConfig;
      }

      const vapi_res = await fetch(
        `https://api.vapi.ai/assistant/${db_assistant.vapi_assistant_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${env.VAPI_API_KEY}`,
          },
          body: JSON.stringify(vapi_agent_config),
        },
      );
      if (!vapi_res.ok || vapi_res.status >= 400) {
        await vapi_res
          .json()
          .then((data) =>
            console.error(
              `Vapi response: ${JSON.stringify(data)}. \n\n body: ${JSON.stringify(vapi_agent_config)}`,
            ),
          )
          .catch((e) => {
            console.error("Error parsing vapi response: ", e);
          });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update vapi agent",
        });
      }
      const updated_vapi_assistant = (await vapi_res.json()) as Assistant;
      const modified_db_assistant = await ctx.db.voice_assistant.update({
        where: { uuid: input.voice_assistant_uuid },
        data: {
          name: input.name,
          voice_enum: input.voice,
          vapi_config: updated_vapi_assistant as unknown as JsonObject,
          prompt_components: prompt_components as JsonObject,
        },
        include: {
          phone_number: true,
          assistants_to_knowledge: { select: { knowledge: true } },
        },
      });
      const agent = expandVoiceAssistant(
        modified_db_assistant,
        updated_vapi_assistant,
      );

      revalidatePath("/receptionists", "layout");
      return agent;
    }),
});

export type AgentOverview = inferProcedureOutput<
  (typeof agentRouter)["getOverview"]
>[number];

export type GetAgentPublic = inferProcedureOutput<
  (typeof agentRouter)["getPublic"]
>;
