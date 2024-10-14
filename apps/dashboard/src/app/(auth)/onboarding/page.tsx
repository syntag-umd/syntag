import React from "react";
import PageClient from "./PageClient";
import { api } from "~/server/trpc/clients/server";
import { redirect } from "next/navigation";
import { env } from "~/env";
export default async function page() {
  const user = await api.user.get();
  if (user) {
    redirect(env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL);
  }
  await api.user.create();
  return (
    <>
      <PageClient />
    </>
  );
}
