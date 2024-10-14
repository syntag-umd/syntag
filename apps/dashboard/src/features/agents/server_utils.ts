import { type Prisma } from "@syntag/db";
import { env } from "~/env";
import { getVapiAssistant, parseVapiAssistant } from "@syntag/vapi/server/api-utils";
import { type Model, modelSchema, type VoiceAssistantExpanded } from "./types";
import { type VoiceAssistantPhoneKnowledge } from "./router";
import { type Assistant } from "@vapi-ai/web/api";
import { type VoiceAssistant } from "~/server/db";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function expandVoiceAssistant(
  db_assistant: VoiceAssistantPhoneKnowledge,
  vapi_assistant?: Assistant,
): Promise<VoiceAssistantExpanded> {
  const db_vapi_config = db_assistant.vapi_config as unknown as Assistant;
  const vapiAssistant =
    (vapi_assistant ?? Object.keys(db_vapi_config).length > 0)
      ? db_vapi_config
      : await getVapiAssistant(db_assistant.vapi_assistant_id ?? "");
  const prompt_components =
    db_assistant.prompt_components as VoiceAssistant["prompt_components"];
  const { firstMessage, voice_config } = parseVapiAssistant(
    vapiAssistant,
    db_assistant.voice_enum,
  );

  const model: Model = {
    instructions: prompt_components.instructions ?? "",
    knowledge: prompt_components.knowledge ?? "",
    firstMessage: firstMessage,
  };
  const validModel = modelSchema.parse(model);

  const r: VoiceAssistantExpanded = {
    voice_assistant: db_assistant,
    phone_number: db_assistant.phone_number[0],
    model: validModel,
    voice_config: voice_config,
    knowledge: db_assistant.assistants_to_knowledge.map((atk) => atk.knowledge),
  };

  return r;
}

/**This function should be called inside of a transaction.
 * First it deletes row from db.
 * Then from vapi
 */
export async function deleteAssistant(
  table_voice_assistants: Prisma.voice_assistantDelegate,
  table_assistants_to_knowledge: Prisma.assistants_to_knowledgeDelegate,
  db_assistant_uuid: string,
  user_uuid: string,
) {
  const voice_assistant = await table_voice_assistants.findUnique({
    where: { uuid: db_assistant_uuid, userUuid: user_uuid },
    include: { phone_number: true },
  });

  // delete attached files
  await table_assistants_to_knowledge.deleteMany({
    where: { voice_assistant_uuid: db_assistant_uuid },
  });

  const deleted_assistant = await table_voice_assistants
    .delete({
      where: { uuid: db_assistant_uuid, userUuid: user_uuid },
      include: { phone_number: true },
    })
    .catch((e) => {
      console.error(e);
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2003") {
          throw new Error(
            "Cannot delete an agent that still has external links",
          );
        }
      }
      throw e;
    });

  let deleteVapi_p: Promise<Response> | undefined;
  if (deleted_assistant.vapi_assistant_id) {
    deleteVapi_p = fetch(
      `https://api.vapi.ai/assistant/${deleted_assistant.vapi_assistant_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${env.VAPI_API_KEY}`,
        },
      },
    );
  }
  if (deleteVapi_p) {
    const deleteVapi = await deleteVapi_p;
    if (!deleteVapi.ok) {
      const e = new Error(
        "Failed deleting vapi agent: " +
          deleteVapi.status +
          " " +
          deleteVapi.statusText,
      );
      console.error(e);
      throw e;
    }
  }

  return deleted_assistant;
}
