import React, { Suspense } from "react";
import Loading from "./loading";

export default function layout(props: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<Loading />}>{props.children}</Suspense>
    </>
  );
}
