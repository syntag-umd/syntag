import React from "react";
import AuthLayout from "~/app/(auth)/sign-in/[[...sign-in]]/AuthLayout";

export default function layout(props: { children: React.ReactNode }) {
  return <AuthLayout>{props.children}</AuthLayout>;
}
