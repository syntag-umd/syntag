"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "~/components/ui/dialog";
import Link from "~/components/ui/Link";
import { api } from "~/server/trpc/clients/react";
import LoadingButton from "~/components/ui/LoadingButton";
import { Button } from "~/components/ui/button";
import { toDisplayCredit } from "~/features/billing/stripe_utils";
import { Input, message, Spin } from "antd";
import { parsePhoneNumber } from "libphonenumber-js";

export const addPhoneWarning = (
  <h4>There is a $2.00 monthly charge for a phone number</h4>
);

export default function BuyNumber({
  button,
  open_ms_delay,
  callback,
}: {
  button: React.ReactNode;
  open_ms_delay?: number;
  callback?: (new_phone_uuid: string) => Promise<void>;
}) {
  const utils = api.useUtils();
  const [loading, setLoading] = useState<boolean>(false);
  const [contentModal, setContentModal] =
    useState<React.ReactNode>(addPhoneWarning);
  const [openModal, setOpenModal] = useState<boolean>(false);

  const phoneNumberMutation = api.phoneNumber.create.useMutation();
  const [contains, setContains] = React.useState("");
  const [areaCode, setAreaCode] = React.useState<number | undefined>(undefined);
  const twilioNumberQuery = api.phoneNumber.listTwilioNumbers.useQuery({
    contains: contains,
    areaCode: areaCode,
  });

  const handleCreatePhoneNumber = async (ac?: number, pn?: string) => {
    try {
      setLoading(true);
      const new_number = await phoneNumberMutation.mutateAsync({
        areaCode: ac,
        contains: pn,
      });
      await utils.phoneNumber.getAll.invalidate();
      if (callback) {
        await callback(new_number.uuid);
      }

      setOpenModal(false);
    } catch (e) {
      console.error(e);
      let message = "An unknown error occured";
      if (e instanceof Error) {
        message = e.message;
      }
      setContentModal(
        <div>
          <p className="mb-2">{addPhoneWarning}</p>
          <p className="mb-0 text-destructive">Error: {message}</p>
          <Link href="/settings/billing" target="_blank">
            Adjust Payment Settings
          </Link>
        </div>,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openModal === false) {
      setContentModal(addPhoneWarning);
    }
  }, [openModal]);

  return (
    <Dialog
      open={openModal}
      onOpenChange={(bool) => {
        if (bool === true && open_ms_delay) {
          setTimeout(() => {
            setOpenModal(bool);
          }, open_ms_delay);
        } else {
          setOpenModal(bool);
        }
      }}
    >
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent className="flex h-[min(100vh,_540px)] max-w-xl flex-col gap-4 bg-card">
        <div>
          {contentModal}
        </div>
        <div className="flex w-full flex-1 flex-col self-start">
          <div className="flex w-full items-center gap-2">
            <div className="basis-32 sm:basis-24">
              <label htmlFor="areaCodeInput" className="mr-2">
                Area Code
              </label>
              <Input
                id="areaCodeInput"
                value={areaCode}
                placeholder="771"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value)) {
                    setAreaCode(undefined);
                  } else if (value < 100 || value > 999) {
                    setAreaCode(undefined);
                  } else {
                    setAreaCode(value);
                  }
                }}
              />
            </div>
            <div className="flex-grow">
              <label htmlFor="containsInput" className="mr-2">
                Contains
              </label>
              <Input
                id="containsInput"
                placeholder="a*1"
                value={contains}
                onChange={(e) => setContains(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-grow basis-0 flex-col items-center space-y-2 overflow-auto px-1 pt-2">
            {loading ||
            (twilioNumberQuery.isLoading && !twilioNumberQuery.isError) ? (
              <Spin className="pt-4" />
            ) : twilioNumberQuery.data && twilioNumberQuery.data.length > 0 ? (
              twilioNumberQuery.data.map((phoneNumber) => {
                const parsedPhoneNumber = parsePhoneNumber(
                  phoneNumber.phoneNumber,
                );
                const areaCode = Number(
                  parsedPhoneNumber.nationalNumber.slice(0, 3),
                );
                console.log(parsedPhoneNumber);
                return (
                  <div key={phoneNumber.phoneNumber} className="w-full">
                    <Button
                      disabled={loading}
                      variant={"ghost"}
                      className="flex w-full items-center justify-center gap-4 rounded bg-background px-2 py-4 hover:text-primary-hover"
                      onClick={() =>
                        handleCreatePhoneNumber(
                          areaCode,
                          parsedPhoneNumber.nationalNumber,
                        )
                      }
                    >
                      {parsedPhoneNumber.formatNational() ??
                        phoneNumber.friendlyName}
                    </Button>
                  </div>
                );
              })
            ) : (
              "No numbers found"
            )}
          </div>
          <div className="flex items-end pt-2">
            <Button
              disabled={loading}
              className="w-full bg-background hover:text-primary"
              variant={"ghost"}
              onClick={() => handleCreatePhoneNumber()}
            >
              Any Phone Number
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
