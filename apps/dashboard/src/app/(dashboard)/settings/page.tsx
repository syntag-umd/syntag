"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import DeleteButton from "./DeleteButton";
import { api } from "~/server/trpc/clients/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import AccountBalance from "./AccountBalance";
import AutoRecharge from "./AutoRecharge";

export default function Page() {
  const { data: billingData, isLoading } = api.billing.get.useQuery();

  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">Account Settings</h1>
      <p className="mb-6 opacity-75">
        Edit workspace settings and view billing
      </p>
      <section className="mb-8 max-w-[960px]">
        <div className="flex justify-between">
          <h2 className="mb-2 text-2xl">Billing</h2>
          <Link href="/settings/billing" target="_blank">
            <Button className="h-8">Open Billing portal</Button>
          </Link>
        </div>
        <div className="flex min-h-[164px] flex-col rounded-xl bg-card p-5 lg:flex-row">
          <div className="flex flex-grow basis-0 flex-col">
            <div className="flex items-start justify-between">
              <h3 className="mb-1 text-xl font-semibold">
                Your account balance
              </h3>
            </div>
            {isLoading ? (
              <Skeleton className="mb-4 h-10 w-3/4" />
            ) : (
              <div className="flex flex-1 flex-col items-baseline gap-4">
                <p className="text-4xl font-semibold">
                  ${billingData?.account_balance ?? "0.00"}
                </p>
                <AutoRecharge />
                <AccountBalance />
              </div>
            )}
          </div>

          <div>
            <Separator
              orientation="vertical"
              className="mx-3 hidden h-full lg:block"
            />
            <Separator
              orientation="horizontal"
              className="my-6 block w-full flex-grow-0 lg:hidden"
            />
          </div>
          <div className="flex-grow basis-0">
            <h3 className="mb-1 text-xl font-semibold">Your next payment</h3>
            {isLoading ? (
              <Skeleton className="mb-4 h-10 w-3/4" />
            ) : (
              <div className="mb-4 flex flex-wrap items-baseline gap-2">
                <p className="text-4xl font-semibold">
                  ${billingData?.invoiceCost}
                </p>
                <p className="text-sm opacity-75">
                  Due by {billingData?.deadline}
                </p>
              </div>
            )}
            <p className="text-sm opacity-75">
              Usage is $8 an hour. <br /> Each phone number is $2.00 monthly.
            </p>
          </div>
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-2xl">Workspace Settings</h2>
        <DeleteButton />
      </section>
    </div>
  );
}
