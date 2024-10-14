import { z } from "zod";

export const agentSettingsFormSchema = z.object({
  name: z.string(),
  profilePicUrl: z.string().url().optional().or(z.literal("")),
  model: z.enum(["GPT_4", "GPT_3_5_TURBO"]),
  instructions: z.string(),
  backgroundNoise: z.enum(["off", "office"]),
  firstMessage: z.string().optional().or(z.literal("")),
  voice: z.enum(["luna", "athena", "orion", "helios"]),
});
export type AgentSettingsFormSchemaType = z.infer<
  typeof agentSettingsFormSchema
>;
