import { registerOTel } from "@vercel/otel";

export async function register() {
  registerOTel({
    serviceName: "dashboard",
    instrumentationConfig: {
      fetch: {
        propagateContextUrls: ["*"],
      },
    },
    propagators: ["tracecontext"],

  });
}
