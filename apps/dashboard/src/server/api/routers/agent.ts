/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { fastApiFetch } from "~/requests";
import { type CreateAssistantDTO } from "@vapi-ai/web/api";
import { agentSettingsFormSchema } from "~/app/_components/VoiceAgentDrawer/types";
import { type voice_assistant } from "@prisma/client";
import { toFastApiErrorResponse } from "~/server/fastApi";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

export interface RetrieveVapiAgentResponse {
  voice_assistant: voice_assistant;
  phone_number: any;
  chatgpt_assistant: any;
  vapi_assistant: any;
}

export interface DeleteVapiAgentResponse {
  voice_assistant: voice_assistant;
}

export const deleteAgentInput = z.object({ voice_assistant_uuid: z.string() });
export type DeleteAgentInput = z.infer<typeof deleteAgentInput>;

export const agentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(agentSettingsFormSchema)
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.auth.getToken();
      const vapi_agent_config: CreateAssistantDTO = {
        voice: {
          provider: "deepgram",
          voiceId: input.voice,
        },
        backgroundSound: input.backgroundNoise,
        firstMessage: input.firstMessage,
      };

      const body = {
        vapi_agent_config,
        chatgpt_assistant_object: {
          instructions: input.instructions,
          model: input.model,
          name: input.name,
        },
        profile_pic_url: input.profilePicUrl,
        create_chatgpt_assistant: true,
        voice_assistant_name: input.name,
      };
      try {
        const res = await fastApiFetch("/vapi/create-vapi-agent", token ?? "", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status >= 400) {
          const errorResponse = await toFastApiErrorResponse(res.json());

          if (typeof errorResponse.detail === "string") {
            throw new Error(errorResponse.detail);
          }
          throw new Error(errorResponse.detail.message);
        }
        revalidateTag("voice-agent");
        revalidatePath("/voice-agent", "layout");
        revalidatePath("/voice-agent", "page");
        revalidatePath("/voice-agent");
        return res;
      } catch (e) {
        throw e;
      }
    }),
  get: protectedProcedure.query(async ({ ctx }) => {
    const token = await ctx.auth.getToken();
    const voice_assistant = await ctx.db.voice_assistant.findFirst({
      where: { userUuid: ctx.auth.sessionClaims.external_id },
    });
    const res = await fastApiFetch(
      `/vapi/retrieve-vapi-agent?voice_assistant_uuid=${voice_assistant?.uuid}`,
      token ?? "",
      {
        method: "GET",
        next: { tags: ["voice-agent"] },
      },
    );
    if (res.status >= 400) {
      const errorResponse = await toFastApiErrorResponse(res.json());

      if (typeof errorResponse.detail === "string") {
        throw new Error(errorResponse.detail);
      }
      throw new Error(errorResponse.detail.message);
    } else {
      return (await res.json()) as RetrieveVapiAgentResponse;
    }
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const token = await ctx.auth.getToken();
    const voice_assistant = await ctx.db.voice_assistant.findMany({
      where: { userUuid: ctx.auth.sessionClaims.external_id },
    });
    const response_promises = [];
    for (const va of voice_assistant) {
      const res = fastApiFetch(
        `/vapi/retrieve-vapi-agent?voice_assistant_uuid=${va.uuid}`,
        token ?? "",
        {
          method: "GET",
          next: { tags: ["voice-agent"] },
        },
      );
      response_promises.push(res);
    }
    const responses = await Promise.allSettled(response_promises);
    const responseJsons: RetrieveVapiAgentResponse[] = [];
    const errors: Error[] = [];
    for (const res of responses) {
      if (res.status === "fulfilled") {
        if (res.value.status >= 400) {
          const errorResponse = await toFastApiErrorResponse(res.value.json());
          if (typeof errorResponse.detail === "string") {
            errors.push(new Error(errorResponse.detail));
            continue;
          }
          errors.push(new Error(errorResponse.detail.message));
          continue;
        }
        const json = (await res.value.json()) as RetrieveVapiAgentResponse;
        responseJsons.push(json);
      } else {
        errors.push(
          new Error("Failed to fetch voice assistant: " + res?.reason),
        );
        continue;
      }
    }
    if (errors.length > 0) {
      console.error(
        "Failed to fetch some voice assistants: " +
          errors.map((e) => e.message).join(", "),
      );
    }
    return responseJsons;
  }),
  delete: protectedProcedure
    .input(deleteAgentInput)
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.auth.getToken();
      const res = await fastApiFetch(`/vapi/delete-vapi-agent`, token ?? "", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        next: { tags: ["voice-agent"] },
      });

      if (res.status >= 400) {
        const errorResponse = await toFastApiErrorResponse(res.json());
        if (typeof errorResponse.detail === "string") {
          throw new Error(errorResponse.detail);
        }
        throw new Error(errorResponse.detail.message);
      } else {
        revalidateTag("voice-agent");
        revalidatePath("/voice-agent", "layout");
        revalidatePath("/voice-agent", "page");
        revalidatePath("/voice-agent");
        return (await res.json()) as DeleteVapiAgentResponse;
      }
    }),
});
