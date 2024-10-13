"use client";

import React, { useEffect, useState } from "react";
import { Card, Skeleton, Input, Typography } from "antd";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "~/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  UpdateAgentSchema,
  updateAgentObjectSchema,
} from "~/features/agents/types";
import { api } from "~/server/trpc/clients/react";
import { useAgent } from "../AgentContext";
import SelectVoice from "./settings/SelectVoice";
import { useUpdateAgent } from "./settings/updateAgentUtils";
import { phone_number } from "@prisma/client";
import { Button } from "@/components/ui/button";
import ErrorDialog from "~/components/ErrorDialog";
import SelectPhoneNumber from "../[agent_id]/SelectPhoneNumber";
import { NoPhoneSubscription } from "../../phone-numbers/PhoneNumberTable";
import DeleteAgent from "./DeleteButton";
import TransferCall from "./settings/TransferCall";

const { Text } = Typography;

const SettingsForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [existingNumber, setExistingNumber] = useState<
    phone_number | undefined
  >(undefined);

  const { agentResponse } = useAgent();

  const { data: phoneNumbers } = api.phoneNumber.getAll.useQuery(void 0, {
    placeholderData: (prev) => prev,
  });
  useEffect(() => {
    const existingNumber = phoneNumbers?.find(
      (p: phone_number) =>
        p.voice_assistant_uuid === agentResponse?.voice_assistant.uuid,
    );
    setExistingNumber(existingNumber);
  }, [phoneNumbers]);
  let default_values: UpdateAgentSchema | undefined;
  if (agentResponse) {
    default_values = {
      voice_assistant_uuid: agentResponse.voice_assistant.uuid,
      voice: agentResponse.voice_config.voice,
      firstMessage: agentResponse.model.firstMessage,
      name: agentResponse.voice_assistant.name ?? "Unnamed",
      transfer: agentResponse.voice_config.transfer,
    } as UpdateAgentSchema;
  }

  const form = useForm<UpdateAgentSchema>({
    resolver: zodResolver(updateAgentObjectSchema),
    values: default_values,
  });

  const { mutateAgent } = useUpdateAgent({
    agent_id: agentResponse?.voice_assistant.uuid ?? "",
  });

  if (!agentResponse) {
    return (
      <Card
        title={
          <div style={{ paddingTop: "12px", paddingBottom: "12px" }}>
            <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              Settings
            </Text>
            <p></p>
            <Text type="secondary" style={{ fontWeight: "normal" }}>
              Manage your representative&apos;s settings
            </Text>
          </div>
        }
        style={{ borderRadius: "12px", width: "100%" }}
        extra={
          // changed &&
          <Button
            type="submit"
            disabled={loading}
            style={{ borderRadius: "5px" }}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        }
      >
        <SettingsSkeleton />
      </Card>
    );
  }

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
  const voice = form.watch("voice");

  return (
    <>
      <ErrorDialog error={error} setError={setError} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card
            title={
              <div style={{ paddingTop: "12px", paddingBottom: "12px" }}>
                <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                  Settings
                </Text>
                <p></p>
                <Text type="secondary" style={{ fontWeight: "normal" }}>
                  Manage your representative&apos;s settings
                </Text>
              </div>
            }
            style={{ borderRadius: "12px", width: "100%", marginBottom: 24 }}
            extra={
              <Button
                type="submit"
                disabled={loading}
                style={{ borderRadius: "5px" }}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            }
            actions={[
              <DeleteAgent
                key="deleteAgent"
                name={name ?? "Unknown"}
                voice_assistant_uuid={agentResponse.voice_assistant.uuid}
                button={
                  <Button variant="destructive" style={{ margin: "12px 0px" }}>
                    Delete {name}
                  </Button>
                }
              />,
            ]}
          >
            <div>
              <input type="hidden" {...form.register("voice_assistant_uuid")} />
              <div className="flex flex-col gap-2">
                <div style={{ paddingBottom: "12px" }}>
                  <div style={{ marginBottom: "6px" }}>
                    <FormLabel>Phone Number</FormLabel>
                  </div>
                  {phoneNumbers ? (
                    <SelectPhoneNumber
                      assistant_uuid={agentResponse.voice_assistant.uuid}
                      phoneNumbers={phoneNumbers}
                      uuidOfExistingNumber={existingNumber?.uuid}
                    />
                  ) : (
                    <NoPhoneSubscription variant="button" />
                  )}
                </div>
                <div className="flex flex-col gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Representative Name</FormLabel>
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
                  {voice && <SelectVoice control={form.control} name="voice" />}
                  <TransferCall form={form} />
                </div>
              </div>
            </div>
          </Card>
        </form>
      </Form>
    </>
  );
};

const SettingsSkeleton = () => (
  <div>
    <div style={{ marginBottom: "24px" }}>
      <Skeleton
        active
        paragraph={{ rows: 1, width: "30%" }}
        title={false}
        style={{ marginBottom: "8px", marginTop: "8px" }}
      />
      <Skeleton.Input
        active
        style={{ width: "100%", height: "2rem", borderRadius: "5px" }}
      />
    </div>

    <div style={{ marginBottom: "24px" }}>
      <Skeleton
        active
        paragraph={{ rows: 1, width: "30%" }}
        title={false}
        style={{ marginBottom: "8px" }}
      />
      <Skeleton.Input
        active
        style={{ width: "100%", height: "2rem", borderRadius: "5px" }}
      />
    </div>

    <div style={{ marginBottom: "24px" }}>
      <Skeleton
        active
        paragraph={{ rows: 1, width: "30%" }}
        title={false}
        style={{ marginBottom: "8px" }}
      />
      <Skeleton.Input
        active
        style={{ width: "100%", height: "2rem", borderRadius: "5px" }}
      />
    </div>

    <div style={{ marginBottom: "24px" }}>
      <Skeleton
        active
        paragraph={{ rows: 1, width: "30%" }}
        title={false}
        style={{ marginBottom: "8px" }}
      />
      <Skeleton.Input
        active
        style={{ width: "100%", height: "2rem", borderRadius: "5px" }}
      />
    </div>
  </div>
);

export default SettingsForm;
