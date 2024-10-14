import React from "react";
import PhoneNumberTable from "./PhoneNumberTable";
import { api } from "~/server/trpc/clients/server";
import { type GetAllPhoneNumberResponse } from "~/features/phone-numbers/router";

export default async function page() {
  const phone_numbers: GetAllPhoneNumberResponse =
    await api.phoneNumber.getAll();

  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">Phone Numbers</h1>
      <p className="mb-6 opacity-75">
        Manage phone numbers for your receptionists
      </p>
      <div className="min-h-[480px] w-full rounded-[15px] bg-secondary px-8 py-4">
        <div>
          <PhoneNumberTable phone_numbers={phone_numbers} />
        </div>
      </div>
    </div>
  );
}
