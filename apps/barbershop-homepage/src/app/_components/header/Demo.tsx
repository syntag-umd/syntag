"use client";

import { CALL_STATUS, useVapi } from "@syntag/vapi/web/useVapi";
import Image from "next/image";

interface Demo {
  className?: string;
}

export default function Demo({ className }: Demo) {
  const { callStatus, toggleCall } = useVapi(
    "f0e49a91-90cd-4299-96e7-9c4e87b46d6b",
  );

  return (
    <div
      className={`w-72 h-fit bg-[color:var(--card)] text-white max-w-fit p-3 rounded-lg text-center ${className}`}
    >
      {/* <div className="flex flex-row justify-between font-bold text-nowrap text-sm">
                <div>Try a demo below</div>
                <div>(555)-555-5555</div>
            </div> */}
      <div className="flex flex-col items-center gap-2">
        <Image
          className="rounded-full"
          src="/headshot.png"
          alt={"AI Receptionist profile picture"}
          width={100}
          height={100}
        />
        <div>
          {" "}
          <span className="font-bold"> AI Receptionist </span> is ready to call{" "}
        </div>
        <div> Click call to start talking </div>
        <button
          className={`${callStatus == CALL_STATUS.ACTIVE ? "bg-red-500" : "bg-[color:var(--primary)]"} w-full m-1 p-1 rounded-md`}
          onClick={() => toggleCall()}
        >
          {callStatus == CALL_STATUS.ACTIVE
            ? "End Call"
            : callStatus == CALL_STATUS.LOADING
              ? "Connecting..."
              : "Start Call"}
        </button>
      </div>
    </div>
  );
}
