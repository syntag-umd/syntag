import { NextResponse } from "next/server";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { env } from "~/env";
import { expandVoiceAssistant } from "~/features/agents/server_utils";
import { VoiceEnum, voicesRecord } from "~/features/agents/types";
import { stripe } from "~/features/billing/stripe";
import { deleteUser } from "~/features/user/utils";
import { getSignedUrl } from "~/lib/gc-storage/server";
import { getVapiAssistant } from "@syntag/vapi/server/api-utils";
import { db } from "~/server/db";

async function addApiKeyAllUsers() {
  const users = await db.user.findMany();
  for (const user of users) {
    if (!user.api_key) {
      const apiKey = uuidv4();
      await db.user.update({
        where: {
          uuid: user.uuid,
        },
        data: {
          api_key: apiKey,
        },
      });
    }
  }
}

async function changeVoiceEnums() {
  const assistants = await db.voice_assistant.findMany({
    include: {
      phone_number: true,
      assistants_to_knowledge: { select: { knowledge: true } },
    },
  });
  const expanded = await Promise.all(
    assistants.map((a) => expandVoiceAssistant(a)),
  );
  const waits = await Promise.all(
    expanded.map(async (e) => {
      const voice_enum = e.voice_config.voice;
      return db.voice_assistant.update({
        where: {
          uuid: e.voice_assistant.uuid,
        },
        data: {
          voice_enum: voice_enum,
        },
      });
    }),
  );
}

async function changeVapiVoices() {
  const assistants = await db.voice_assistant.findMany({});
  const vapi_updates = await Promise.all(
    assistants.map(async (assistant) => {
      const vapi_res = await fetch(
        `https://api.vapi.ai/assistant/${assistant.vapi_assistant_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${env.VAPI_API_KEY}`,
          },
          body: JSON.stringify({
            voice: voicesRecord[assistant.voice_enum as VoiceEnum].vapiConfig,
          }),
        },
      );
      if (!vapi_res.ok) {
        console.error(await vapi_res.text());
      } else {
        await db.voice_assistant.update({
          where: {
            uuid: assistant.uuid,
          },
          data: {
            vapi_config: await vapi_res.json(),
          },
        });
      }
    }),
  );
}

async function changeCustomLLMUrl() {
  console.log("Changing to ", env.CUSTOM_LLM_URL);
  const assistants = await db.voice_assistant.findMany({});
  const vapi_assistants = await Promise.all(
    assistants.map(async (assistant) => {
      const vapi_assistant = await getVapiAssistant(
        assistant.vapi_assistant_id!,
      );

      const body = {
        model: {
          messages: vapi_assistant.model!.messages,
          tools: vapi_assistant.model!.tools,
          model: "gpt-3.5-turbo",
          provider: "custom-llm",
          url: `${env.CUSTOM_LLM_URL}`,
        },
      };

      const vapi_res = await fetch(
        `https://api.vapi.ai/assistant/${vapi_assistant.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${env.VAPI_API_KEY}`,
          },
          body: JSON.stringify(body),
        },
      );
      if (!vapi_res.ok) {
        console.error(await vapi_res.text());
      } else {
        await db.voice_assistant.update({
          where: {
            uuid: assistant.uuid,
          },
          data: {
            vapi_config: await vapi_res.json(),
          },
        });
      }
    }),
  );
}

async function changePaymentMethodStripePortal() {
  /* const products = await stripe.products.list({ active: true, limit: 100 });
  const update_products = await Promise.all(
    products.data.map(async (p) => {
      const prices = await stripe.prices.list({ product: p.id });
      const update: Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product =
        {
          prices: prices.data.map((price) => price.id),
          product: p.id,
        };
      return update;
    }),
  ); */
  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "SynTag Billing Portal",
      privacy_policy_url: "https://syntag.ai/privacy-policy",
      terms_of_service_url: "https://syntag.ai/terms-of-service",
    },
    features: {
      customer_update: { enabled: false },
      invoice_history: { enabled: false },
      subscription_cancel: { enabled: false },
      /* subscription_update: {
        enabled: false,
        default_allowed_updates: null,
        products: update_products,
      }, */
      payment_method_update: { enabled: true },
    },
  });
  console.log("BILLING PORTAL CONFIGURATION: ", configuration);
}

export async function GET() {
  /* const signedUrl = await getSignedUrl("FastAPI - Swagger UI.html");
  console.log(signedUrl); */
  /* await changePaymentMethodStripePortal(); */
  /* await deleteUser(db, "user_2lceblHXjTmFlVMLEdWPgpkIpbz"); */
  return new NextResponse("response");
}
