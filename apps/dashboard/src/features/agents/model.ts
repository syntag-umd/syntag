import { type OpenAIMessage } from "@vapi-ai/web/api";
import {
  type EmotionTags,
  type FormalityLevel,
  type HumorLevel,
  type ToneOfVoice,
} from "./types";
import { VoiceAssistant } from "~/server/db";

export function composeSystemPrompt(
  { knowledge, instructions, emotionTags }: VoiceAssistant["prompt_components"],
  name: string,
): OpenAIMessage[] {
  const systemInstructions = `You are a helpful assistant named ${name}. 
  
A person will call you. Because this is a voice call, you should be concise.

The time in UTC is {{now}}.

You must follow the instructions in the INSTRUCTIONS section.

To answer questions, you should use the knowledge in the KNOWLEDGE section.

${
  emotionTags &&
  `When answering questions, you should consider the following:
  Your formality level is ${emotionTags.formalityLevel}.
  Your tone of voice is ${emotionTags.toneOfVoice}.
  Your humor level is ${emotionTags.humorLevel}.`
}

INSTRUCTIONS:
${instructions}
END INSTRUCTIONS

KNOWLEDGE:
${knowledge}
END KNOWLEDGE`;
  const messages: OpenAIMessage[] = [
    { content: systemInstructions, role: "system" },
  ];
  return messages;
}
