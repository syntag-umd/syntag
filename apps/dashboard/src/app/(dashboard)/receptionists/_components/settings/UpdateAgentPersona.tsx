"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import {
  type UpdateAgentSchema,
  updateAgentObjectSchema,
} from "~/features/agents/types";

import ErrorDialog from "@/components/ErrorDialog";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { api } from "~/server/trpc/clients/react";
import { useUpdateAgent } from "./updateAgentUtils";
import SelectVoice from "./SelectVoice";

export default function UpdateAgentPersona(props: { agent_id: string }) {
  const agentQuery = api.agent.get.useQuery(
    { agent_id: props.agent_id },
    {
      placeholderData: (prev) => prev,
    },
  );
  let default_values: UpdateAgentSchema | undefined;
  if (agentQuery.data) {
    default_values = {
      voice_assistant_uuid: agentQuery.data.voice_assistant.uuid,
      voice: agentQuery.data.voice_config.voice,
      firstMessage: agentQuery.data.model.firstMessage,
      name: agentQuery.data.voice_assistant.name ?? "Unnamed",
    } as UpdateAgentSchema;
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const form = useForm<UpdateAgentSchema>({
    resolver: zodResolver(updateAgentObjectSchema),
    values: default_values,
  });

  const { mutateAgent } = useUpdateAgent({ agent_id: props.agent_id });

  async function onSubmit(values: UpdateAgentSchema) {
    setLoading(true);
    try {
      await mutateAgent(values);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error("An unknown error occured"));
      }
    } finally {
      setLoading(false);
    }
  }

  const name = form.watch("name");

  return (
    <>
      <ErrorDialog error={error} setError={setError} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-background">
            <Accordion
              defaultValue={["customization", "speech"]}
              type="multiple"
              className="w-full"
            >
              <input type="hidden" {...form.register("voice_assistant_uuid")} />
              <div className="mb-2 flex flex-col gap-2">
                <AccordionItem value="customization" className="bg-card">
                  <AccordionTrigger className=" px-4 py-2 text-lg">
                    Customization
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-5 bg-card px-[12px] py-3">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => {
                          return (
                            <FormItem>
                              <FormLabel>Agent Name</FormLabel>
                              <FormControl>
                                <Input
                                  className="bg-background"
                                  placeholder="John Doe"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="firstMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First message</FormLabel>
                            <FormControl>
                              <Input
                                className="bg-background"
                                placeholder={`Hi, this is ${name ?? "John Doe"} speaking. How can I help you today?`}
                                {...field}
                                value={field.value ?? undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <SelectVoice control={form.control} name="voice" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
            </Accordion>
            <div className="flex-end mb-2 flex flex-row items-center gap-2">
              <Button type="submit" disabled={loading} className="w-full">
                {`${loading ? "Saving..." : "Save"}`}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
