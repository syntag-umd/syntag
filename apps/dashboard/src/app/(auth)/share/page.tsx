import React, { Suspense } from "react";
import ClientPage from "./ClientPage";

export default function page() {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}
