"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Button as ButtonAnt, Input } from "antd";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useFieldArray,
  useForm,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { type UpdateAgentSchema } from "~/features/agents/types";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PhoneNumber } from "./shared";
import { Separator } from "~/components/ui/separator";
import { Icons } from "~/components/Icons";

export default function TransferCall({
  form,
}: {
  form: UseFormReturn<UpdateAgentSchema>;
}) {
  const {
    fields: transferFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "transfer",
  });
  transferFields;

  const transfer = useWatch({ name: "transfer", control: form.control });
  useEffect(() => {
    if (form.formState.errors.transfer) {
      void form.trigger("transfer");
    }
  }, [form, transfer]);
  return (
    <div className="w-full">
      <input type="hidden" {...form.register("voice_assistant_uuid")} />
      <div className="mb-2 flex flex-col gap-2">
        <p className="relative text-base">
          Transfer Call
          {form.formState.errors.transfer && (
            <span className="absolute right-[-0.75rem] text-destructive">
              *
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3 bg-card px-[12px] py-3">
          <ul className="space-y-4">
            {transferFields.map((transferField, index) => {
              return (
                <li
                  key={transferField.id}
                  className="relative flex flex-col gap-4 pb-2 pt-0"
                >
                  <Button
                    size={"icon"}
                    variant={"destructive"}
                    onClick={() => remove(index)}
                    className="absolute right-0 top-0 rounded-lg"
                  >
                    <Icons.trash className="h-5 w-5" />
                  </Button>
                  {form.formState.errors.transfer?.[index] && (
                    <p className="m-0 text-destructive">
                      Fill out all inputs or remove this item.
                    </p>
                  )}
                  <div className="flex justify-between">
                    <PhoneNumber
                      //@ts-ignore This is valid
                      control={form.control}
                      name={`transfer.${index}.phoneNumber`}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`transfer.${index}.message`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message before transferring</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={`Hold on, I'm sending you to our sales team.`}
                            {...field}
                            value={field.value ?? undefined}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`transfer.${index}.criteria`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Criteria to transfer</FormLabel>
                        <FormControl>
                          <Input.TextArea
                            rows={4}
                            placeholder={`If a caller asks how do they purchase...`}
                            {...field}
                            value={field.value ?? undefined}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                </li>
              );
            })}
          </ul>
          <ButtonAnt
            type="default"
            className="border-[1px] border-solid border-input"
            onClick={() => {
              append({
                phoneNumber: "",
                message: "",
                criteria: "",
              });
            }}
          >
            Add Transfer Number
          </ButtonAnt>
        </div>
      </div>
    </div>
  );
}
