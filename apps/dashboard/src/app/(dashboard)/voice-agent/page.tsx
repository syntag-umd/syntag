import React from "react";
import { Heading, Stack, Text } from "@chakra-ui/react";
import VoiceAgentDrawer from "~/app/_components/VoiceAgentDrawer/VoiceAgentDrawer";
import { api } from "~/trpc/server";
import AgentCard from "~/app/_components/AgentCard";
import { type Assistant } from "@vapi-ai/web/api";

export default async function page() {
  const all_voice_assistants = await api.agent.getAll();
  return (
    <div className="pr-[10vw]">
      <Stack direction="row" className="justify-between">
        <div>
          <Heading size="2xl"> Voice Agents </Heading>
          <Text> Configure custom voice agents </Text>
        </div>
        <div className="m-5 ">
          <VoiceAgentDrawer />
        </div>
      </Stack>
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {all_voice_assistants.map((agent) => (
          <AgentCard
            key={agent.voice_assistant.uuid}
            voice_assistant_uuid={agent.voice_assistant.uuid}
            name={agent.voice_assistant.name ?? ("Unnamed Agent" as string)}
            role={"Customer Support"}
            profileUrl={agent.voice_assistant.profile_pic_url ?? ""}
            assistantId={agent.vapi_assistant as Assistant} 
          />
        ))}
      </div>
    </div>
  );
}
