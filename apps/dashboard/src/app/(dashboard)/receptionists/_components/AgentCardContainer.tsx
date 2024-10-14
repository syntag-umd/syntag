"use client";

import React from "react";
import { type AgentOverview } from "~/features/agents/router";
import { api } from "~/server/trpc/clients/react";
import AgentCard from "./AgentCard";

export default function AgentCardContainer(props: {
  assistantOverviews: AgentOverview[];
}) {
  const assistantOverviewQuery = api.agent.getOverview.useQuery(void 0, {
    initialData: props.assistantOverviews,
  });

  return (
    <>
      {assistantOverviewQuery.data
        ?.sort((a, b) => {
          const aIsNullish = a.pn === null || a.pn === undefined;
          const bIsNullish = b.pn === null || b.pn === undefined;
          if (aIsNullish && !bIsNullish) return 1;
          if (!aIsNullish && bIsNullish) return -1;
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        })
        .map((agent) => {
          return (
            <AgentCard
              key={agent.uuid}
              name={agent.name ?? "Unnamed"}
              uuid={agent.uuid}
              voice_id={agent.voice_id}
              pn={agent.pn}
            />
          );
        })}
    </>
  );
}
