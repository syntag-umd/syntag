import {
  type Assistant as VapiAssistant,
  type Assistant,
  type CreateTransferCallToolDTO,
  type NumberTransferDestination,
} from "@vapi-ai/web/api";
import { env } from "~/env";
import { type Db } from "~/server/db";

import {
  getVoiceKeyFromVapiConfig,
  transferSchema,
  voiceConfigSchema,
  type TransferSchema,
  type VoiceConfig,
} from "~/features/agents/types";

export const getVapiAssistant = async (
  vapi_assistant_id: string,
): Promise<Assistant> => {
  const vapi_res = await fetch(
    `https://api.vapi.ai/assistant/${vapi_assistant_id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.VAPI_API_KEY}`,
      },
    },
  );
  const vapiJson = (await vapi_res.json()) as Assistant;
  return vapiJson;
};

/** This imports the phone number to vapi. Should be called after a phone number is purchased/created */

export async function importPhoneNumberToVapi(
  db: Db,
  phone_number_uuid: string,
) {
  const db_phone_number = await db.phone_number.findFirst({
    where: { uuid: phone_number_uuid },
  });
  if (!db_phone_number) {
    throw new Error("Phone number not found");
  }
  if (!db_phone_number.pn) {
    throw new Error("Phone number has no number");
  }

  //  Compilant with latest documentation but does not seem to work
  //  Imports and connects to assistant

  /* const add_phone_body: CreateTwilioPhoneNumberDTO = {
    twilioAccountSid: env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: env.TWILIO_AUTH_TOKEN,
    number: db_phone_number.pn,
    provider: "twilio",
    serverUrl: env.NEXT_PUBLIC_FASTAPI_BASE_URL + "/vapi/server-url",
    serverUrlSecret: env.VAPI_SECRET,
  };

  const vapiRes = await fetch(
    "https://api.vapi.ai/phone-number/import/twilio",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VAPI_API_KEY}`,
      },
      body: JSON.stringify(add_phone_body),
    },
  );

  const vapiJson = await vapiRes.json();
  const vapiPhonenumberId = vapiJson.id as undefined | string;
  if (!vapiPhonenumberId) {
    console.error(vapiJson, add_phone_body.number);
    throw new Error("Vapi phone number not imported");
  } */

  const add_phone_body = {
    twilioAccountSid: env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: db_phone_number.pn,
  };

  const vapiRes = await fetch(
    "https://api.vapi.ai/phone-number/import/twilio",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VAPI_API_KEY}`,
      },
      body: JSON.stringify(add_phone_body),
    },
  );

  const vapiJson = await vapiRes.json();
  const vapiPhonenumberId = vapiJson.id as undefined | string;
  if (!vapiPhonenumberId) {
    console.error(vapiJson, add_phone_body.twilioPhoneNumber);
    throw new Error("Vapi phone number not imported");
  }
  const updatedPhoneNumber = await db.phone_number.update({
    where: { uuid: phone_number_uuid },
    data: { vapi_phone_number_id: vapiPhonenumberId },
  });
  return updatedPhoneNumber;
}

/**Parses vapi assistant to get transfer information */
export function parseTransferCallTool(assistant: Assistant): TransferSchema[] {
  const transferTool = assistant.model?.tools?.find(
    (val) => val.type === "transferCall",
  );

  if (!transferTool) {
    return [];
  }

  const destinations = transferTool.destinations as NumberTransferDestination[];
  const transfers: TransferSchema[] = [];
  destinations.forEach((destination) => {
    const obj: TransferSchema = {
      message: destination.message!,
      phoneNumber: destination.number,
      criteria: destination.description!,
    };
    const parsed = transferSchema.parse(obj);
    transfers.push(parsed);
  });

  return transfers;
}
/**Add the return value as an item in the model.tools array for assistant */

export function prepareTransferCallTool(
  transfers: TransferSchema[],
): CreateTransferCallToolDTO {
  const phoneNumberDestinations = transfers.map((transfer) => {
    const d: NumberTransferDestination = {
      type: "number",
      number: transfer.phoneNumber,
      message: transfer.message,
      description: transfer.criteria,
    };
    return d;
  });

  const prepared: CreateTransferCallToolDTO = {
    async: false,
    type: "transferCall",
    destinations: phoneNumberDestinations,
    function: {
      name: "transferCall",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            //@ts-ignore its valid
            enum: transfers.map((transfer) => transfer.phoneNumber),
          },
        },
        required: ["destination"],
      },
    },
  };
  return prepared;
}
export function parseVapiAssistant(
  assistant: VapiAssistant,
  voice_enum: string | null,
): {
  firstMessage: string;
  voice_config: VoiceConfig;
} {
  if (!assistant.model) {
    throw new Error("Vapi Assistant doesn't have model");
  }
  if (!assistant.voice) {
    throw new Error("Vapi Assistant doesn't have voice");
  }

  const transfers = parseTransferCallTool(assistant);

  const voice_config = voiceConfigSchema.parse({
    vapiAssistantId: assistant.id,
    voice:
      voice_enum ??
      getVoiceKeyFromVapiConfig({
        provider: assistant.voice.provider,
        voiceId: assistant.voice.voiceId,
      }),
    transfer: transfers,
  });

  return {
    firstMessage: assistant.firstMessage!,
    voice_config: voice_config,
  };
}

