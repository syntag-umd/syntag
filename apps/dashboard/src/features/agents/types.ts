import {
  type knowledge,
  type voice_assistant,
  type phone_number,
} from "@syntag/db";
import {
  type AzureVoice,
  type ElevenLabsVoice,
  type OpenAIMessage,
} from "@vapi-ai/web/api";
import { type ZodType, z } from "zod";
import { zfd } from "zod-form-data";
import parsePhoneNumber from "libphonenumber-js";
import { type StaticImageData } from "next/image";
import headshotAmericanMan from "~/../public/headshots/white man.png";
import headshotItalianMan from "~/../public/headshots/italian man.png";
import headshotBlondeWoman from "~/../public/headshots/white blonde woman.png";
import headshotBrunetteWoman from "~/../public/headshots/white brunette woman.png";
import headshotBritishMan from "~/../public/headshots/white ginger man.png";
import headshotBritishWoman from "~/../public/headshots/british woman.png";
import headshotAfricanAmericanMan from "~/../public/headshots/african american man.png";
import headshotAfricanAmericanWoman from "~/../public/headshots/african american woman.png";
import headshotIndianMan from "~/../public/headshots/indian man.png";
import headshotIndianWoman from "~/../public/headshots/indian woman.png";
import headshotHispanicMan from "~/../public/headshots/hispanic man.png";
import headshotHispanicWoman from "~/../public/headshots/hispanic woman.png";
import headshotAsianMan from "~/../public/headshots/asian man.png";
import headshotAsianWoman from "~/../public/headshots/asian woman.png";
import { type VoiceAssistantPhoneKnowledge } from "./router";

export enum FormalityLevel {
  None = "None",
  Casual = "Casual",
  Business = "Business",
  Professional = "Professional",
}

export enum ToneOfVoice {
  None = "None",
  Informative = "Informative",
  Assertive = "Assertive",
  Persuasive = "Persuasive",
}

export enum HumorLevel {
  None = "None",
  Serious = "Serious",
  Subtle = "Subtle",
  Lighthearted = "Lighthearted",
}

export const DEFAULT_MODEL = "gpt-4o-mini";

const emotionTagsSchema = z.object({
  formalityLevel: z.nativeEnum(FormalityLevel),
  toneOfVoice: z.nativeEnum(ToneOfVoice),
  humorLevel: z.nativeEnum(HumorLevel),
});

export type EmotionTags = z.infer<typeof emotionTagsSchema>;

export type EmotionValue =
  | typeof FormalityLevel
  | typeof ToneOfVoice
  | typeof HumorLevel;

export interface PreconfiguredAgentProps {
  agent: CreateAgentSchema;
  cardProps: {
    name: string;
    emotionDescription: string;
    purposeDescription: string;
  };
}

export enum Accents {
  "american" = "General American",
  "africanamerican" = "African American",
  "indian" = "Indian",
  "british" = "British",
  "spanish" = "Spanish",
  "asian" = "East Asian",
}

export interface VoiceOption {
  vapiConfig: ElevenLabsVoice;
  demoAudio: string;
  picSrc: StaticImageData | string;
  name: string;
  gender: "male" | "female";
  accent: keyof typeof Accents;
  description: string;
}
/**This is the key and its used as value in forms */
export const voiceEnum = z.enum([
  "american_male",
  "american_male_2",
  "american_female_2",
  "american_female",
  "africanamerican_male",
  "british_female",
  "british_male",
  "africanamerican_female",
  "indian_man",
  "indian_female",
  "spanish_male",
  "spanish_female",
  "asian_man",
  "asian_female",
]);
export type VoiceEnum = z.infer<typeof voiceEnum>;

export const voicesRecord: Record<VoiceEnum, VoiceOption> = {
  american_female: {
    vapiConfig: { provider: "11labs", voiceId: "g1gkVFi2jgj2rTKdNDq7" }, //vapi has a different id for the same voice
    demoAudio: "/audio/11labs.Cth3Obi7wcGe9TqXrhGS.mp3",
    picSrc: headshotBlondeWoman,
    name: "Ava",
    gender: "female",
    accent: "american",
    description: "Friendly and reassuring",
  },
  american_male: {
    vapiConfig: {
      provider: "11labs",
      voiceId: "uju3wxzG5OhpWcoi3SMy",
    },
    demoAudio: "/audio/11labs.uju3wxzG5OhpWcoi3SMy.mp3",
    picSrc: headshotAmericanMan,
    name: "Paul",
    gender: "male",
    accent: "american",
    description: "Rich and clear",
  },
  american_female_2: {
    vapiConfig: { provider: "11labs", voiceId: "jBzLvP03992lMFEkj2kJ" },
    demoAudio: "/audio/11labs.kG1NcGdvgqwNj44uVLX4.mp3",
    picSrc: headshotBrunetteWoman,
    name: "Claire",
    gender: "female",
    accent: "american",
    description: "Upbeat and warm",
  },
  american_male_2: {
    vapiConfig: { provider: "11labs", voiceId: "4JVOFy4SLQs9my0OLhEw" },
    demoAudio: "/audio/11labs.4JVOFy4SLQs9my0OLhEw.mp3",
    picSrc: headshotItalianMan,
    name: "Andrew",
    gender: "male",
    accent: "american",
    description: "Sharp and direct",
  },
  africanamerican_female: {
    vapiConfig: { provider: "11labs", voiceId: "aTxZrSrp47xsP6Ot4Kgd" },
    demoAudio: "/audio/11labs.aTxZrSrp47xsP6Ot4Kgd.mp3",
    picSrc: headshotAfricanAmericanWoman,
    name: "Kayla",
    gender: "female",
    accent: "africanamerican",
    description: "Velvety and engaging",
  },
  africanamerican_male: {
    vapiConfig: { provider: "11labs", voiceId: "yHx9q5iHmtVGKONrqrIf" },
    demoAudio: "/audio/11labs.yHx9q5iHmtVGKONrqrIf.mp3",
    picSrc: headshotAfricanAmericanMan,
    name: "Mike",
    gender: "male",
    accent: "africanamerican",
    description: "Baritone and professional",
  },

  indian_female: {
    vapiConfig: { provider: "11labs", voiceId: "2zRM7PkgwBPiau2jvVXc" },
    demoAudio: "/audio/11labs.2zRM7PkgwBPiau2jvVXc.mp3",
    picSrc: headshotIndianWoman,
    name: "Aashi",
    gender: "female",
    accent: "indian",
    description: "Confident and clear",
  },
  indian_man: {
    vapiConfig: { provider: "11labs", voiceId: "3gsg3cxXyFLcGIfNbM6C" },
    demoAudio: "/audio/11labs.3gsg3cxXyFLcGIfNbM6C.mp3",
    picSrc: headshotIndianMan,
    name: "Raju",
    gender: "male",
    accent: "indian",
    description: "Warm and professional",
  },

  spanish_female: {
    vapiConfig: {
      provider: "11labs",
      voiceId: "tvWD4i07Hg5L4uEvbxYV",
    },
    demoAudio: "/audio/11labs.tvWD4i07Hg5L4uEvbxYV.mp3",
    picSrc: headshotHispanicWoman,
    name: "Carmen",
    gender: "female",
    accent: "spanish",
    description: "Lively and causal",
  },
  spanish_male: {
    vapiConfig: { provider: "11labs", voiceId: "dlGxemPxFMTY7iXagmOj" },
    demoAudio: "/audio/11labs.dlGxemPxFMTY7iXagmOj.mp3",
    picSrc: headshotHispanicMan,
    name: "Fernando",
    gender: "male",
    accent: "spanish",
    description: "Confident and professional",
  },
  asian_female: {
    vapiConfig: { provider: "11labs", voiceId: "hmD4OXeLrQIVXXUdliAG" },
    demoAudio: "/audio/11labs.hmD4OXeLrQIVXXUdliAG.mp3",
    picSrc: headshotAsianWoman,
    name: "Ann",
    gender: "female",
    accent: "asian",
    description: "Mellow and cool",
  },
  asian_man: {
    vapiConfig: { provider: "11labs", voiceId: "owsLoyJNU4K7ctU6NF7F" },
    demoAudio: "/audio/11labs.owsLoyJNU4K7ctU6NF7F.mp3",
    picSrc: headshotAsianMan,
    name: "Wayne",
    gender: "male",
    accent: "asian",
    description: "Receptive and casual",
  },
  british_female: {
    vapiConfig: { provider: "11labs", voiceId: "4CrZuIW9am7gYAxgo2Af" },
    demoAudio: "/audio/11labs.4CrZuIW9am7gYAxgo2Af.mp3",
    picSrc: headshotBritishWoman,
    name: "Hollie",
    gender: "female",
    accent: "british",
    description: "Brisk and sharp",
  },
  british_male: {
    vapiConfig: { provider: "11labs", voiceId: "kmSVBPu7loj4ayNinwWM" },
    demoAudio: "/audio/11labs.kmSVBPu7loj4ayNinwWM.mp3",
    picSrc: headshotBritishMan,
    name: "Ron",
    gender: "male",
    accent: "british",
    description: "Friendly and straightforward",
  },
};

export function getVoiceKeyFromVapiConfig(vapiConfig: {
  provider: string;
  voiceId: string;
}) {
  for (const key of voiceEnum.options) {
    if (
      voicesRecord[key].vapiConfig.provider === vapiConfig.provider &&
      voicesRecord[key].vapiConfig.voiceId === vapiConfig.voiceId
    ) {
      return key;
    }
  }
  console.error("Voice from vapi not valid: ", vapiConfig);
  return "american_male";
}

const optionalFormString = zfd.text(z.string().optional());

const phoneNumberRegex = /^\+\d+$/;
export function transformPhoneNumber(val: string) {
  const parsed = parsePhoneNumber(val);
  if (!parsed) {
    return "";
  }
  return `+${parsed.countryCallingCode}${parsed.nationalNumber}`;
}
const phoneNumberSchema = z
  .string()
  .transform(transformPhoneNumber)
  .refine((val) => phoneNumberRegex.test(val), {
    message: "Invalid Phone Number",
  });

const transferFilled = z.object({
  phoneNumber: phoneNumberSchema,
  message: zfd.text(),
  criteria: zfd.text(),
});

export const transferSchema = z.preprocess((val, ctx) => {
  if (val === undefined) return val;
  let object: Record<string, any>;

  if (val !== null && typeof val === "object") {
    object = val;
    const keys = Object.keys(object);
    keys.forEach((key) => {
      if (Object.hasOwn(val, key)) {
        if (object[key] === "" || object[key] == undefined) {
          delete object[key];
        }
      }
    });
    if (Object.keys(object).length === 0) return undefined;
    return object;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Invalid arguement to transfer number object",
  });
}, transferFilled);

export type TransferSchema = z.infer<typeof transferSchema>;

const createAgentObject = {
  name: zfd.text(),
  knowledge: optionalFormString,
  instructions: zfd.text(),
  firstMessage: optionalFormString,
  voice: voiceEnum,
  selectedKnowledge: zfd.repeatableOfType(zfd.text()),
  phone_number_uuids: z.array(z.string()).optional(),
  transfer: zfd.repeatable(z.array(zfd.json(transferSchema))).optional(),
  emotionTags: zfd.json(emotionTagsSchema),
  areaCode: optionalFormString,
  websiteRef: optionalFormString,
};

export const createAgentObjectSchema = z.object(createAgentObject);

export type CreateAgentSchema = z.infer<typeof createAgentObjectSchema>;

export const updateAgentObjectSchema = createAgentObjectSchema
  .partial({
    name: true,
    voice: true,
    emotionTags: true,
    instructions: true,
    selectedKnowledge: true,
  })
  .merge(
    z.object({
      voice_assistant_uuid: zfd.text(),
    }),
  )
  .omit({ areaCode: true, websiteRef: true });

export type UpdateAgentSchema = z.infer<typeof updateAgentObjectSchema>;

const messages = z.array(
  z.object({
    content: z.string(),
    role: z.enum(["assistant", "function", "user", "system", "tool"]),
  }),
) satisfies ZodType<OpenAIMessage[]>;

export const modelSchema = z.object({
  firstMessage: z.string().optional(),
  instructions: z.string(),
  knowledge: z.string(),
});

export type Model = z.infer<typeof modelSchema>;

export const voiceConfigSchema = z.object({
  vapiAssistantId: z.string(),
  voice: voiceEnum,
  transfer: z.array(transferSchema).optional(),
});

export type VoiceConfig = z.infer<typeof voiceConfigSchema>;

export interface VoiceAssistantExpanded {
  voice_assistant: voice_assistant;
  knowledge: knowledge[];
  model: Model;
  voice_config: VoiceConfig;
  phone_number?: phone_number;
}

export type VoiceAssistantFlattened = VoiceAssistantPhoneKnowledge &
  Model &
  VoiceConfig;
