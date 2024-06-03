"use client";

import {
  Avatar,
  Card,
  CardHeader,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import CallButton from "./CallButton";
import { useVapi } from "~/lib/hooks/useVapi";
import { type Assistant } from "@vapi-ai/web/api";


import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { useState } from "react";
import ErrorDialog from "./ErrorDialog";
import { api } from "~/trpc/react";
import { type DeleteAgentInput } from "~/server/api/routers/agent";
import { useRouter } from "next/navigation";

interface AgentCardProps {
  voice_assistant_uuid: string;
  name: string;
  role: string;
  assistantId: Assistant;
  profileUrl?: string;
  phoneNumber?: string;
}

function AgentCard(props: AgentCardProps) {
  const { toggleCall, callStatus } = useVapi(props.assistantId.id);

  return (
      <Card overflow="hidden" p={2} bg={"var(--card)"} className="min-w-[250px]">    
        <Stack direction="row" justifyContent={"space-between"} className="min-w-[250px]">
          <div className="flex gap-2">
          <Avatar
            size="lg"
            className="m-3 mr-0"
            name={props.name}
            src={props.profileUrl}
            bg={"brand"}
          />
          <CardHeader className="pl-2">
            <Heading size="lg" className="mr-5">{props.name}</Heading>
            <Text>
              {props.role} · {props.phoneNumber ?? "Phone Number Not Connected"}
            </Text>
          </CardHeader>
        </div>
      </Stack>
      <div className="flex-initial ml-auto">
        <CallButton
          callStatus={callStatus}
          toggleCall={toggleCall}
        />
        <DeleteAgent {...props} />
      </div>
    </Card>
  );
}

export default AgentCard;

function DeleteAgent(props: AgentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errordialogMessage, setErrorDialogMessage] = useState<
    string | undefined
  >(undefined);

  const agentDeleteMutation = api.agent.delete?.useMutation();
  const router = useRouter();
  const handleDelete = async (values: DeleteAgentInput) => {
    setLoading(true);
    try {
      await agentDeleteMutation.mutateAsync(values);
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
      }, 500);
    } catch (e) {
      if (e instanceof Error) {
        setErrorDialogMessage(e.message);
      } else {
        setErrorDialogMessage("An unknown error occured");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ErrorDialog
        setMessage={setErrorDialogMessage}
        message={errordialogMessage}
      />
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger>
          <Button variant={"destructive"} size={"sm"}>
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to remove agent{" "}
              <span className="bg-card text-nowrap px-2 py-1">
                {props.name}
              </span>
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone, and will remove all configurations
              and settings with this agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant={"destructive"}
              disabled={loading}
              onClick={() =>
                handleDelete({
                  voice_assistant_uuid: props.voice_assistant_uuid,
                })
              }
            >
              {(loading) ? "Removing..." : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
