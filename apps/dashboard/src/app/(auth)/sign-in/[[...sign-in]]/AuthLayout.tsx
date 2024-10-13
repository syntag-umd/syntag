import React from "react";

export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center">
      {props.children}
    </div>
  );
}
