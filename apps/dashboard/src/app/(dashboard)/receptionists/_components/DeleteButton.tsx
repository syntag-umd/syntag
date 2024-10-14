"use client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CSSProperties, useState } from "react";
import ErrorDialog from "@/components/ErrorDialog";

import { useRouter } from "next/navigation";
import { api } from "~/server/trpc/clients/react";
import { type DeleteAgentInput } from "~/features/agents/router";

function DeleteAgent(props: {
  name: string;
  voice_assistant_uuid: string;
  button: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const utils = api.useUtils();
  const agentDeleteMutation = api.agent.delete?.useMutation();
  const router = useRouter();
  const handleDelete = async (values: DeleteAgentInput) => {
    setLoading(true);
    try {
      await agentDeleteMutation.mutateAsync(values);
      router.push("/receptionists");
      await utils.agent.getOverview.invalidate();
      await utils.agent.getAll.invalidate();
      setTimeout(() => {
        setIsOpen(false);
      }, 500);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error("An unknown error occured"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ErrorDialog setError={setError} error={error} />
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger>
          <div style={{ display: "inline-block" }}>{props.button}</div>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-input">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to remove agent{" "}
              <span className="text-nowrap bg-card px-[0.375rem] py-1">
                {props.name} ?
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone, and will remove all configurations
              and settings with this agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button
              variant={"destructive"}
              disabled={loading}
              onClick={() =>
                handleDelete({
                  voice_assistant_uuid: props.voice_assistant_uuid,
                })
              }
            >
              {loading ? "Removing..." : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export default DeleteAgent;
