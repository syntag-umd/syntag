import React from "react";
import { api } from "~/server/trpc/clients/server";
import ClientCache from "./ClientCache";

export default async function layout(props: { children: React.ReactNode }) {
  const assistants_overview = await api.agent.getOverview();
  return (
    <div>
      <ClientCache agents_uuid={assistants_overview.map((v) => v.uuid)}>
        <div className="lg:pr-[10vw]">{props.children}</div>
      </ClientCache>
    </div>
  );
}
