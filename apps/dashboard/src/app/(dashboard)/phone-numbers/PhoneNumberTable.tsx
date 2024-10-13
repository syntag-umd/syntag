"use client";
import React, { useState } from "react";
import { api } from "~/server/trpc/clients/react";
import { useRouter } from "next/navigation";
import ErrorDialog from "@/components/ErrorDialog";
import { type GetAllPhoneNumberResponse } from "~/features/phone-numbers/router";
import { parsePhoneNumber } from "libphonenumber-js";
import { Button, Spin, Typography } from "antd";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogHeader,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import LoadingButton from "~/components/ui/LoadingButton";
import BuyNumber from "./BuyNumber";

export default function PhoneNumberTable(props: {
  phone_numbers: NonNullable<GetAllPhoneNumberResponse> | null;
}) {
  const { data: phoneNumbers, isLoading: isPhoneNumbersLoading } =
    api.phoneNumber.getAll.useQuery(void 0, {
      initialData: props.phone_numbers,
    });

  if (isPhoneNumbersLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spin />
      </div>
    );
  }

  if (phoneNumbers === null || phoneNumbers === undefined) {
    return <NoPhoneSubscription />;
  }

  return (
    <div>
      <div className="m-1 flex justify-between gap-2">
        <h5 className="my-auto font-semibold">
          You have {phoneNumbers.length} phone number
          {phoneNumbers.length != 1 && "s"}
        </h5>
        <BuyNumber
          button={
            <Button size={"large"} type="primary">
              Add Number
            </Button>
          }
        />
      </div>
      <ul className="mt-4 space-y-4">
        {phoneNumbers.map((phone_number) => (
          <PhoneNumberRow key={phone_number.uuid} phone_number={phone_number} />
        ))}
      </ul>
    </div>
  );
}

export function NoPhoneSubscription({
  variant = "description",
}: {
  variant?: "description" | "button";
}) {
  const utils = api.useUtils();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const billingSub = api.billing.initPhoneSubscription.useMutation();

  const handleAddPhoneNumberSubscription = async () => {
    try {
      setLoading(true);
      await billingSub.mutateAsync();
      utils.phoneNumber.getAll.setData(void 0, []);
      void utils.phoneNumber.getAll.invalidate(void 0, {
        refetchType: "all",
        type: "all",
      });
      setTimeout(() => {
        router.refresh();
      });
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

  if (variant === "description") {
    return (
      <>
        <ErrorDialog setError={setError} error={error} />
        <div className="flex items-center gap-2">
          You don&apos;t have an active subscription.
          <LoadingButton
            loading={loading}
            onClick={handleAddPhoneNumberSubscription}
          >
            Create Subscription
          </LoadingButton>
        </div>
      </>
    );
  }
  return (
    <>
      <ErrorDialog setError={setError} error={error} />
      <Button onClick={handleAddPhoneNumberSubscription} loading={loading}>
        Create Subscription
      </Button>
    </>
  );
}

function PhoneNumberRow({
  phone_number,
}: {
  phone_number: NonNullable<GetAllPhoneNumberResponse>[number];
}) {
  const formattedNumber = parsePhoneNumber(
    phone_number.pn ?? "",
  ).formatNational();
  return (
    <li className="mb-2 flex items-center justify-between rounded-[10px] bg-popover px-4 py-2">
      <div>
        <div>
          {phone_number.voice_assistant?.name ? (
            <h3>{phone_number.voice_assistant.name}&apos;s phone</h3>
          ) : (
            <h5 className="opacity-60">No Receptionist</h5>
          )}
        </div>
        <div>{formattedNumber}</div>
      </div>
      <DeletePhoneNumber
        phone_number_uuid={phone_number.uuid}
        pn={formattedNumber}
        agent_name={phone_number.voice_assistant?.name ?? undefined}
      />
    </li>
  );
}

const DeletePhoneNumber = (props: {
  phone_number_uuid: string;
  pn: string;
  agent_name?: string;
}) => {
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const deletePhoneNumber = api.phoneNumber.delete.useMutation();

  const handleDeletePhoneNumber = async (phone_number_uuid: string) => {
    try {
      setLoading(true);
      await deletePhoneNumber.mutateAsync({
        phone_number_uuid: phone_number_uuid,
      });
      void utils.agent.get.invalidate();
      await utils.phoneNumber.getAll.invalidate();
    } catch (e) {
      console.error(e);
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
      <ErrorDialog error={error} setError={setError} />
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-input">
          <AlertDialogHeader className="mb-5 space-y-2">
            <AlertDialogTitle>
              <h3>
                Confirm delete <span className="text-nowrap">{props.pn}</span>
              </h3>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <ul className="list-inside list-disc text-base">
                <li>This cancels the renewal of the number.</li>
                <li>You will lose this specifc number.</li>
                {props.agent_name && (
                  <li>
                    This will remove the number from{" "}
                    <Typography.Text code>{props.agent_name}</Typography.Text>
                  </li>
                )}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <LoadingButton
              variant={"destructive"}
              onClick={() => handleDeletePhoneNumber(props.phone_number_uuid)}
              loading={loading}
            >
              Delete
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
