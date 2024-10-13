"use client";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import Link from "next/link";
import { Card } from "antd";
import { type AgentOverview } from "~/features/agents/router";
import Image from "next/image";
import { voicesRecord } from "~/features/agents/types";
import parsePhoneNumber from "libphonenumber-js";
export default function AgentCard({ uuid, name, voice_id, pn }: AgentOverview) {
  const formattedNumber: string | undefined =
    typeof pn === "string" ? parsePhoneNumber(pn)?.formatNational() : undefined;
  return (
    <Link href={`/receptionists/${uuid}`}>
      <Card className="min-w-[250px] cursor-pointer bg-[--card] px-4 py-6 hover:bg-card-hover">
        <div className="flex flex-grow justify-between">
          <div className="flex gap-2 align-middle">
            <Avatar className="m-auto h-20 w-20 rounded-lg">
              {voice_id ? (
                <Image
                  src={voicesRecord[voice_id].picSrc}
                  alt={voicesRecord[voice_id].name}
                  quality={100}
                  width={80}
                  height={80}
                />
              ) : (
                <AvatarFallback className="rounded-lg bg-primary text-3xl">
                  {name}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="m-auto">
              <h2 className="mb-0 mt-1 font-semibold">{name}</h2>
              {typeof formattedNumber === "string" ? (
                <div className="text-base">{formattedNumber}</div>
              ) : (
                <div className="text-base opacity-50">(No number)</div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
