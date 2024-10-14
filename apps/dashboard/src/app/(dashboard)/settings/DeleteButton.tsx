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
import { useState } from "react";
import ErrorDialog from "@/components/ErrorDialog";
import { api } from "~/server/trpc/clients/react";
import { useClerk } from "@clerk/nextjs";
import { syntagSignOut } from "~/app/ClerkProvider";

function DeleteAccount() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const { signOut } = useClerk();

  const accountDeleteMutation = api.user.delete.useMutation();
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await accountDeleteMutation.mutateAsync();
      await syntagSignOut(signOut);
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
          <Button size={"sm"}>Delete Account</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-input">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button disabled={loading} onClick={handleDeleteAccount}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DeleteAccount;
