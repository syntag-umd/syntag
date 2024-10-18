import Vapi from "@vapi-ai/web";

const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
if (!apiKey) {
  throw Error("VAPI_API_KEY is not set");
}

export const vapi = new Vapi(apiKey);
