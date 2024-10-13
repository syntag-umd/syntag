import { z } from "zod";
import { zfd } from "zod-form-data";

export const ingestFileSchema = z.object({
  files: zfd.repeatableOfType(zfd.file(z.instanceof(File))),
});

export type UploadFileForm = z.infer<typeof ingestFileSchema>;

export const ingestFileFormSchema = zfd.formData(ingestFileSchema);

export const formattedUrlSchema = z
  .string()
  .regex(
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
    "Invalid URL",
  )
  .transform((url) =>
    url
      .replace(/#.*$/, "")
      .replace(/\/$/, "")
      .replace("https://www.", "https://"),
  );

const uiUrlSchema = z.preprocess((arg) => {
  if (typeof arg === "string") {
    if (!arg.startsWith("https://")) {
      return `https://${arg}`;
    }
  }
  return arg;
}, formattedUrlSchema);

export const ingestWebsiteSchema = z.object({
  url: uiUrlSchema,
  crawl: z.boolean(),
  assistant_uuid: z.string().optional(),
});

export const ingestWebsitesSchema = z.object({
  websites: z.array(ingestWebsiteSchema.omit({ assistant_uuid: true })),
  assistant_uuid: z.string().optional(),
});

export type IngestWebsiteInput = z.infer<typeof ingestWebsiteSchema>;
export type IngestWebsitesInput = z.infer<typeof ingestWebsitesSchema>;

export const enqueueWebsiteSchema = z
  .object({
    userUuid: z.string(),
    originalUrl: z.string(),
  })
  .merge(ingestWebsiteSchema);

export type EnqueueWebsite = z.infer<typeof enqueueWebsiteSchema>;

export const receiveWebsiteSchema = z
  .object({
    knowledge_uuid: z.string(),
  })
  .merge(enqueueWebsiteSchema)
  .omit({ url: true });

export type ReceiveWebsite = z.infer<typeof receiveWebsiteSchema>;
