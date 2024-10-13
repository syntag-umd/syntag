"use client";

import React from "react";
import { SelectGroup, SelectItem } from "@/components/ui/select";
import { type UseControllerProps, useController } from "react-hook-form";
import {
  type UpdateAgentSchema,
  type CreateAgentSchema,
  transformPhoneNumber,
} from "~/features/agents/types";
import { FormLabel } from "@/components/ui/form";

export function VoiceSelect() {
  return (
    <SelectGroup>
      <SelectItem value="american_female_2">Ava (US Female)</SelectItem>
      <SelectItem value="american_male">Andrew (US Male)</SelectItem>
      <SelectItem value="british_female">Hollie (UK Female)</SelectItem>
      <SelectItem value="british_male">Oliver (UK Male)</SelectItem>
    </SelectGroup>
  );
}
import PhoneInput from "antd-phone-input";

export function PhoneNumber(
  props: UseControllerProps<
    CreateAgentSchema | UpdateAgentSchema,
    `transfer.${number}.phoneNumber`
  >,
) {
  const { field, fieldState } = useController(props);

  return (
    <div className="w-56">
      {fieldState.error && (
        <p className="text-destructive">{fieldState.error.message}</p>
      )}
      <FormLabel>Phone number to transfer to</FormLabel>
      <PhoneInput
        enableSearch
        value={field.value}
        onChange={(phone) => {
          const phoneNumberConcat = `+${phone.countryCode}${phone.areaCode}${phone.phoneNumber}`;
          const phoneNumber = transformPhoneNumber(phoneNumberConcat);
          field.onChange(phoneNumber);
        }}
      />
    </div>
  );
}
