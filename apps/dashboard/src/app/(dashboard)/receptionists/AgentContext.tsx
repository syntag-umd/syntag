"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { api } from "~/server/trpc/clients/react";
import { useRouter } from "next/navigation";
import Link from "~/components/ui/Link";
import { VoiceAssistantExpanded } from "~/features/agents/types";

interface AgentContextProps {
  agentResponse: VoiceAssistantExpanded | undefined;
  isAgentError: boolean;
  agentError: any;
  agent_id: string;
}

const AgentContext = createContext<AgentContextProps | undefined>(undefined);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
};

export const AgentProvider: React.FC<{
  children: ReactNode;
  agent_id: string;
}> = ({ children, agent_id }) => {
  const router = useRouter();
  const {
    data: agentResponse,
    isError: isAgentError,
    error: agentError,
  } = api.agent.get.useQuery(
    { agent_id: agent_id },
    {
      placeholderData: (prev) => prev,
    },
  );

  if (isAgentError) {
    if (agentError?.message == "No receptionists found") {
      void router.push("/receptionists");
    }
    return (
      <div className="flex w-full flex-col items-center">
        <h3>Failed to get agent.</h3>
        <Link href="/receptionists">Go back</Link>
      </div>
    );
  }

  return (
    <AgentContext.Provider
      value={{ agentResponse, isAgentError, agentError, agent_id }}
    >
      {children}
    </AgentContext.Provider>
  );
};
