"use client";
import { Button, Spin } from "antd";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import React from "react";
import { CallButtonWrapped } from "~/app/(dashboard)/receptionists/_components/CallButton";
import { api } from "~/server/trpc/clients/react";
import logo from "~/../public/logo_name.png";
import Link from "next/link";

export default function ClientPage() {
  const searchParams = useSearchParams();
  const assistant_id = searchParams.get("id");
  const assistant_query = api.agent.getPublic.useQuery({
    agent_id: assistant_id ?? "",
  });
  if (assistant_query.isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spin />
      </div>
    );
  }
  if (assistant_query.isError || !assistant_query.data?.vapi_assistant_id) {
    console.error("Assistant query error: ", assistant_query.error?.message);
    return (
      <div className="flex justify-center py-4">
        Failed to load. Check the id the url.
      </div>
    );
  }

  return (
    <div className="flex flex-col px-6 py-12 sm:px-[10vw]">
      <div className="mb-24 flex items-center justify-between gap-4">
        <Link href={"https://syntag.ai"} target="_blank">
          <Image src={logo} alt="SynTag's Logo" height={60} className="mb-4" />
        </Link>
        <div className="flex justify-center gap-4 text-xl">
          <Link href={"/sign-in"}>
            <Button size="large">Log in</Button>
          </Link>
          <Link href={"/sign-up"}>
            <Button size="large" type="primary">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4">
        <h3 className="mb-2">Start the demo for {assistant_query.data.name}</h3>
        <CallButtonWrapped
          vapi_assistant_id={assistant_query.data.vapi_assistant_id}
        />
      </div>
      <div className="mt-24 flex justify-center gap-4">
        <Link href={"https://calendly.com/maxskaufmann"}>
          <Button size="large">Meet with Max</Button>
        </Link>
        <Link href={"https://calendly.com/vikram-from-syntag"}>
          <Button size="large">Meet with Vikram</Button>
        </Link>
      </div>
    </div>
  );
}
