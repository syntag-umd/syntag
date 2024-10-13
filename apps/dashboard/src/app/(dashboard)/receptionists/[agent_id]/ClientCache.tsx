"use client";
import React from "react";
import { api } from "~/server/trpc/clients/react";

export default function ClientCache({
  children,
  agent_uuid,
}: {
  children: React.ReactNode;
  agent_uuid: string;
}) {
  const utils = api.useUtils();

  void utils.agent.get.prefetch({ agent_id: agent_uuid });

  void utils.conversations.getConvos
    .fetch({ agent_id: agent_uuid })
    .then((data) => {
      utils.conversations.getConvos.setData({ agent_id: agent_uuid }, data);
      data.forEach((convo) => {
        void utils.conversations.getConvoExpanded.prefetch({
          convo_uuid: convo.uuid,
        });
      });
    });

  return <>{children}</>;
}
