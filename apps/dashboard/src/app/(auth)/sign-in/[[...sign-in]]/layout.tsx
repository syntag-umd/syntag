import React from "react";
import AuthLayout from "./AuthLayout";

export default function layout(props: { children: React.ReactNode }) {
  return <AuthLayout>{props.children}</AuthLayout>;
}
