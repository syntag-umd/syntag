import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**This follows same values the same as nextjs/vercel */
const envSchema = z.enum(["production", "preview", "development"]).default("development");
const ddVersionSchema = z.object({
  version: z.string(),
  git_commit_sha: z.string().default(""),
}).transform((data) => `${data.version}-${data.git_commit_sha}`)

const VERSION_STRING = ddVersionSchema.parse({version: process.env.NEXT_PUBLIC_VERSION, git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA})

const ENVIRONMENT = envSchema.parse(process.env.NEXT_PUBLIC_ENV);

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    CUSTOM_LLM_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CLERK_SECRET_KEY: z.string(),
    STRIPE_API_KEY: z.string(),
    GC_BUCKET_NAME: z.string(),
    GC_SERVICE_EMAIL: z.string(),
    GC_SERVICE_PRIVATE_KEY: z.string(),
    GC_PROJECT_ID: z.string(),
    GC_WEBSCRAPER_QUEUE_NAME: z.string(),
    GC_LOCATION: z.string().default("us-east4"),
    VAPI_API_KEY: z.string(),
    VAPI_SECRET: z.string(),
    TWILIO_ACCOUNT_SID: z.string(),
    TWILIO_AUTH_TOKEN: z.string(),
    STRIPE_ACCOUNT_BALANCE_PRICE_ID: z.string(),
    STRIPE_PHONE_NUMBER_PRICE_ID: z.string(),
    STRIPE_PHONE_NUMBER_FEATURE_KEY: z.string(),
    STRIPE_AGENT_USAGE_PRICE_ID: z.string(),
    STRIPE_BILLING_PORTAL_PAYMENTS: z.string(),
    JINA_API_KEY: z.string(),
    SYNTAG_ADMIN_KEY: z.string(),
    ZILLIZ_API_KEY: z.string(),
    ZILLIZ_CLOUD_REGION: z.string(),
    ZENDESK_MAIL_APIKEY: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_FLAG_LIVE_PHONES: z.enum(["TRUE", "FALSE"]).default(process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "TRUE" : "FALSE"),

    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_FASTAPI_BASE_URL: z.string().url(),
    NEXT_PUBLIC_VAPI_API_KEY: z.string(),
    NEXT_PUBLIC_ENV: envSchema,
    NEXT_PUBLIC_VERSION: z.string(),
    NEXT_PUBLIC_BROWSER_ANALYTICS: z.enum(["TRUE", "FALSE"]).default(ENVIRONMENT === "development" ? "FALSE" : "TRUE"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    CUSTOM_LLM_URL: process.env.CUSTOM_LLM_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_FLAG_LIVE_PHONES: process.env.NEXT_PUBLIC_FLAG_LIVE_PHONES,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
    NEXT_PUBLIC_FASTAPI_BASE_URL: process.env.NEXT_PUBLIC_FASTAPI_BASE_URL,
    NEXT_PUBLIC_VAPI_API_KEY: process.env.NEXT_PUBLIC_VAPI_API_KEY,
    GC_BUCKET_NAME: process.env.GC_BUCKET_NAME,
    GC_SERVICE_EMAIL: process.env.GC_SERVICE_EMAIL,
    GC_SERVICE_PRIVATE_KEY: (process.env.GC_SERVICE_PRIVATE_KEY ?? "").replace(
      /\\n/g,
      "\n",
    ),
    GC_PROJECT_ID: process.env.GC_PROJECT_ID,
    GC_WEBSCRAPER_QUEUE_NAME: process.env.GC_WEBSCRAPER_QUEUE_NAME,
    GC_LOCATION: process.env.GC_LOCATION,
    VAPI_API_KEY: process.env.VAPI_API_KEY,
    VAPI_SECRET: process.env.VAPI_SECRET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    STRIPE_ACCOUNT_BALANCE_PRICE_ID: process.env.STRIPE_ACCOUNT_BALANCE_PRICE_ID,
    STRIPE_PHONE_NUMBER_PRICE_ID: process.env.STRIPE_PHONE_NUMBER_PRICE_ID,
    STRIPE_PHONE_NUMBER_FEATURE_KEY: process.env.STRIPE_PHONE_NUMBER_FEATURE_KEY,
    STRIPE_AGENT_USAGE_PRICE_ID: process.env.STRIPE_AGENT_USAGE_PRICE_ID,
    STRIPE_BILLING_PORTAL_PAYMENTS: process.env.STRIPE_BILLING_PORTAL_PAYMENTS,
    NEXT_PUBLIC_ENV: ENVIRONMENT,
    NEXT_PUBLIC_VERSION: VERSION_STRING,
    JINA_API_KEY: process.env.JINA_API_KEY,
    SYNTAG_ADMIN_KEY: process.env.SYNTAG_ADMIN_KEY,
    ZILLIZ_API_KEY: process.env.ZILLIZ_API_KEY,
    ZILLIZ_CLOUD_REGION: process.env.ZILLIZ_CLOUD_REGION,
    ZENDESK_MAIL_APIKEY: process.env.ZENDESK_MAIL_APIKEY,
    NEXT_PUBLIC_BROWSER_ANALYTICS: process.env.NEXT_PUBLIC_BROWSER_ANALYTICS,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

