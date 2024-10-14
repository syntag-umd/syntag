import React from "react";
import { api } from "~/server/trpc/clients/server";
import ClientLayout from "./ClientLayout";
import WizardOnboard from "./WizardOnboard";
import { Spin } from "antd";

export default async function Layout(props: { children: React.ReactNode }) {
  const user = await api.user.get();
  if (!user) {
    console.warn("User not found dashboard layout");
  }

  const isOnboared = user?.onboarding_stage === null;

  return (
    <ClientLayout>
      {isOnboared ? (
        props.children
      ) : (
        <WizardOnboard db_user={user ?? undefined} />
      )}
    </ClientLayout>
  );
}
