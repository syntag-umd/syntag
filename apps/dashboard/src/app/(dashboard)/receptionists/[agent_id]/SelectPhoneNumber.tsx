"use client";
import React, { useEffect, useState } from "react";
import { type GetAllPhoneNumberResponse } from "~/features/phone-numbers/router";
import { Divider, Select, Typography } from "antd";
import parsePhoneNumber from "libphonenumber-js";
import { api } from "~/server/trpc/clients/react";
import ErrorDialog from "~/components/ErrorDialog";
import { useRouter } from "next/navigation";
import BuyNumber from "../../phone-numbers/BuyNumber";

const { Text } = Typography;

export default function SelectPhoneNumber(props: {
  assistant_uuid: string;
  phoneNumbers: NonNullable<GetAllPhoneNumberResponse>;
  uuidOfExistingNumber?: string;
}) {
  const apiUtils = api.useUtils();
  const [currentPhoneNumberUuid, setCurrentPhoneNumberUuid] = useState<
    string | undefined
  >(props.uuidOfExistingNumber);
  useEffect(() => {
    setCurrentPhoneNumberUuid(props.uuidOfExistingNumber);
  }, [props.uuidOfExistingNumber]);
  
  const router = useRouter();
  const [openSelect, setOpenSelect] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const linkToAssistant = api.phoneNumber.linkToAssistant.useMutation();
  const unlinkAndLinkToAssistant =
    api.phoneNumber.unlinkAndLinkToAssistant.useMutation();
  const handleChange = async (phone_uuid: string) => {
    try {
      setLoading(true);
      let resp;
      if (currentPhoneNumberUuid) {
        resp = await unlinkAndLinkToAssistant.mutateAsync({
          voice_assistant_uuid: props.assistant_uuid,
          current_phone_number_uuid: currentPhoneNumberUuid,
          new_phone_number_uuid: phone_uuid,
        });
      } else {
        resp = await linkToAssistant.mutateAsync({
          phone_number_uuid: phone_uuid,
          voice_assistant_uuid: props.assistant_uuid,
        });
      }
      setCurrentPhoneNumberUuid(resp.uuid);
      router.refresh();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error("An unknown error occured changing numbers"));
      }
    } finally {
      setLoading(false);
    }
  };

  const unlinkFromAssistant = api.phoneNumber.unlinkFromAssistant.useMutation();
  const handleUnlink = async () => {
    if (!currentPhoneNumberUuid) {
      setError(new Error("No number to unlink"));
      return;
    }
    try {
      setLoading(true);
      await unlinkFromAssistant.mutateAsync({
        phone_number_uuid: currentPhoneNumberUuid,
        voice_assistant_uuid: props.assistant_uuid,
      });

      setCurrentPhoneNumberUuid(undefined);
      router.refresh();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error("An unknown error occured unlinking"));
      }
    } finally {
      setLoading(false);
    }
  };

  const callbackBuyNumber = async (new_num_uuid: string) => {
    try {
      if (currentPhoneNumberUuid) {
        await unlinkAndLinkToAssistant.mutateAsync({
          voice_assistant_uuid: props.assistant_uuid,
          current_phone_number_uuid: currentPhoneNumberUuid,
          new_phone_number_uuid: new_num_uuid,
        });
      } else {
        await linkToAssistant.mutateAsync({
          phone_number_uuid: new_num_uuid,
          voice_assistant_uuid: props.assistant_uuid,
        });
      }
      setCurrentPhoneNumberUuid(new_num_uuid);
      void apiUtils.agent.get.invalidate({ agent_id: props.assistant_uuid });
      return;
    } catch (e) {
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ErrorDialog error={error} setError={setError} />
      <Select
        value={parsePhoneNumber(
          props.phoneNumbers.find(
            (phoneNumber) => phoneNumber.uuid === currentPhoneNumberUuid,
          )?.pn ?? "",
        )?.formatNational()}
        placeholder="Select a phone number"
        onChange={handleChange}
        open={openSelect}
        onDropdownVisibleChange={setOpenSelect}
        loading={loading}
        disabled={loading}
        popupMatchSelectWidth={false}
        placement="bottomLeft"
        listHeight={164}
        notFoundContent={<Text type="secondary">No numbers available</Text>}
        style={{ height: "40px", width: "100%" }}
        options={props.phoneNumbers
          .filter((p) => p.pn != null && p.uuid !== currentPhoneNumberUuid)
          .map((phoneNumber, index) => {
            const parsed = parsePhoneNumber(phoneNumber.pn!);
            return {
              label: parsed?.formatNational(),
              value: phoneNumber.uuid,
              disabled:
                phoneNumber.voice_assistant_uuid !== null &&
                phoneNumber.uuid !== currentPhoneNumberUuid,
            };
          })}
        dropdownRender={(menu) => {
          return (
            <div>
              <BuyNumber
                button={
                  <button
                    onClick={() => setOpenSelect(false)}
                    className="flex w-full  px-2 pb-1 pt-1 text-primary underline-offset-1 hover:text-primary hover:opacity-75"
                  >
                    Quickbuy Number
                  </button>
                }
                open_ms_delay={250}
                callback={callbackBuyNumber}
              />

              <Divider style={{ margin: "2px 0px" }} />
              {menu}
              <Divider style={{ margin: "2px 0px" }} />
              {currentPhoneNumberUuid && (
                <>
                  <button
                    onClick={handleUnlink}
                    className="flex w-full justify-end px-2 py-1 text-destructive hover:text-primary hover:opacity-75"
                  >
                    Unlink Number
                  </button>
                  <Divider style={{ margin: "2px 0px" }} />
                </>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
