import React from "react";

export default async function layout(props: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between mb-5">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Analytics</h1>
          <p className="mb-6 opacity-75">
            Get insights on your receptionists&apos; call history
          </p>
        </div>
      </div>
      <div className="lg:pr-[10vw]">{props.children}</div>
    </div>
  );
}
