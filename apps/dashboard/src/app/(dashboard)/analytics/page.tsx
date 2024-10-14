import React from "react";
import { api } from "~/server/trpc/clients/server";
import { AnalyticsPage } from "./AnalyticsPage";
import { parsePhoneNumber } from "libphonenumber-js";

export default async function Page() {
  // Fetch the receptionists data
  const receptionists = await api.agent.getAll();

  // Create a map from receptionist ids to names, suffixing with the phone number where possible
  const receptionistMap = receptionists.reduce(
    (acc, agent) => {
      // Ensure phone_number is a string or an empty string
      const formattedPhoneNumber = agent.phone_number?.pn
        ? parsePhoneNumber(agent.phone_number.pn).formatNational()
        : "";

      acc[agent.voice_assistant.uuid] =
        `${agent.voice_assistant.name} ${formattedPhoneNumber}`;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <AnalyticsPage
      receptionists={receptionists.map((agent) => agent.voice_assistant.uuid)}
      receptionistMap={receptionistMap}
    />
  );
}
