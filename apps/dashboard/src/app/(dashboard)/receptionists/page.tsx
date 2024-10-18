import React from "react";
import { api } from "~/server/trpc/clients/server";
import AgentCardContainer from "./_components/AgentCardContainer";
import CreateAgentModal from "./_components/settings/CreateAgentModal";

export default async function page() {
  const assistants_overviews = await api.agent.getOverview();
  return (
    <>
      <div className="mb-5 flex justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">AI Receptionists</h1>
          <p className="mb-6 opacity-75">Configure custom AI Receptionists</p>
        </div>
        <div className="m-5">
          <CreateAgentModal />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <AgentCardContainer assistantOverviews={assistants_overviews} />
      </div>
    </>
  );
}
