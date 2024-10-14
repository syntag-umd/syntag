"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  updateAgentObjectSchema,
  type UpdateAgentSchema,
} from "~/features/agents/types";
import { api } from "~/server/trpc/clients/react";
import { useUpdateAgent } from "./updateAgentUtils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";
import ErrorDialog from "~/components/ErrorDialog";
import SelectMemory from "./SelectMemory";
import { Button } from "~/components/ui/button";

export default function UpdateAgentKnowledge(props: { agent_id: string }) {
  const agentQuery = api.agent.get.useQuery(
    { agent_id: props.agent_id },
    {
      placeholderData: (prev) => prev,
    },
  );
  let default_values: UpdateAgentSchema | undefined;
  if (agentQuery.data) {
    const selectedKnowledge: string[] =
      agentQuery.data.knowledge.map((kn) => kn.uuid) ?? [];

    default_values = {
      voice_assistant_uuid: agentQuery.data.voice_assistant.uuid,
      instructions: agentQuery.data.model.instructions,
      knowledge: agentQuery.data.model.knowledge,
      selectedKnowledge: selectedKnowledge,
    } as UpdateAgentSchema;
  }

  const clientFilesQuery = api.knowledge.getClientDocuments.useQuery(void 0, {
    placeholderData: (prev) => prev,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const form = useForm<UpdateAgentSchema>({
    resolver: zodResolver(updateAgentObjectSchema),
    values: default_values,
  });
  const selectedKnowledge = form.watch("selectedKnowledge");

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
  return (
    <>
      <ErrorDialog error={error} setError={setError} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-background">
            <Accordion
              defaultValue={["knowledge", "instructions"]}
              type="multiple"
              className="w-full"
            >
              <input type="hidden" {...form.register("voice_assistant_uuid")} />
              <div className="mb-2 flex flex-col gap-2">
                <AccordionItem value="knowledge" className="bg-card">
                  <AccordionTrigger className="px-4 py-2 text-lg">
                    Knowledge
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-3 bg-card px-[12px] py-3">
                      <FormField
                        control={form.control}
                        name="knowledge"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                rows={4}
                                placeholder="All office hours have been canceled for the day."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="instructions" className="bg-card">
                  <AccordionTrigger className="px-4 py-2 text-lg">
                    Instructions
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-3 bg-card px-[12px] py-3">
                      <FormField
                        control={form.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                rows={4}
                                placeholder="You should be concise and informative."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="documents" className="bg-card">
                  <AccordionTrigger className="px-4 py-2 text-lg">
                    Documents
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-3 bg-card px-[12px] py-3">
                      <SelectMemory
                        clientFiles={clientFilesQuery.data ?? []}
                        selectedKnowledge={selectedKnowledge ?? []}
                        setSelectedKnowledge={form.setValue.bind(
                          null,
                          "selectedKnowledge",
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
            </Accordion>
            <div className="flex-end mb-2 flex flex-row items-center gap-2">
              <Button type="submit" disabled={loading} className="w-full">
                {`${loading ? "Saving... (modifying documents can take up to a minute)" : "Save"}`}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
