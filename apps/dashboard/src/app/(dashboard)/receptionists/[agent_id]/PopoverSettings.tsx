"use client";
import React, { useState } from "react";
import { Popover } from "antd";
import { Button } from "~/components/ui/button";
import { Icons } from "~/components/Icons";
import { type VoiceAssistantExpanded } from "~/features/agents/types";
import DeleteButton from "../_components/DeleteButton";
import { type GetAllPhoneNumberResponse } from "~/features/phone-numbers/router";
import SelectPhoneNumber from "./SelectPhoneNumber";
import { NoPhoneSubscription } from "../../phone-numbers/PhoneNumberTable";
export default function PopoverSettings({
  agentResponse,
  phoneNumbers,
  uuidOfExistingNumber,
}: {
  agentResponse: VoiceAssistantExpanded;
  phoneNumbers: GetAllPhoneNumberResponse | undefined;
  uuidOfExistingNumber: string | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Popover
        trigger="click"
        open={isOpen}
        onOpenChange={setIsOpen}
        overlayInnerStyle={{ backgroundColor: "var(--background)" }}
        placement="bottomRight"
        content={
          <div className="flex flex-col items-center gap-2">
            <div onClick={() => setIsOpen(false)}>
              <DeleteButton
                name={agentResponse.voice_assistant.name ?? "Unnamed"}
                voice_assistant_uuid={agentResponse.voice_assistant.uuid}
              button={
                  <Button variant={"outline"}>
                    <Icons.trash size={"1.25rem"} className="mr-2" />
                    Delete
                  </Button>
                }
              />
            </div>
            <div className="min-[516px]:hidden">
              {phoneNumbers ? (
                <SelectPhoneNumber
                  assistant_uuid={agentResponse.voice_assistant.uuid}
                  phoneNumbers={phoneNumbers}
                  uuidOfExistingNumber={uuidOfExistingNumber}
                />
              ) : (
                <NoPhoneSubscription variant="button" />
              )}
            </div>
          </div>
        }
      >
        <Button
          variant={"outline"}
          className="h-10 border-[1px] border-primary"
          size={"icon"}
        >
          <Icons.ellipsis color="var(--primary)" />
        </Button>
      </Popover>
    </div>
  );
}
