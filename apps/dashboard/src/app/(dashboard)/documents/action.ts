"use server";
import { storage } from "~/lib/gc-storage/server";
import { env } from "~/env";

export async function getSignedUrl(filename: string) {
  const options = {
    version: "v4" as const,
    action: "read" as const,
    expires: Date.now() + 60 * 60 * 1000,
  };

  const file = storage.bucket(env.GC_BUCKET_NAME).file(filename);
  const [url] = await file.getSignedUrl(options);
  return url;
}
