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
      className={`w-full h-full bg-[color:var(--card)] text-white rounded-lg text-center ${className}`}
    >
       <Image
          onClick={() => toggleCall()}
          src="/receptionist.png"
          alt={"AI Receptionist profile picture"}
          width={1000}
          height={1000}
        />
      {/* <div className="flex flex-row justify-between font-bold text-nowrap text-sm">
                <div>Try a demo below</div>
                <div>(555)-555-5555</div>
            </div> */}
    </div>
  );
}
