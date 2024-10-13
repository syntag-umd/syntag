"use client";
import React from "react";
import { api } from "~/server/trpc/clients/react";

export default function ClientCache({
  children,
  agents_uuid,
}: {
  children: React.ReactNode;
  agents_uuid: string[];
}) {
  const utils = api.useUtils();

  agents_uuid.forEach((uuid) => {
    void utils.agent.get.prefetch({ agent_id: uuid });
  });

  void utils.phoneNumber.getAll.prefetch(void 0);

  return <>{children}</>;
}
