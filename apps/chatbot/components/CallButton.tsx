import { PhoneOff, PhoneOutgoing, Loader2 } from "lucide-react";
import { CALL_STATUS, useVapi } from "@syntag/vapi/web/useVapi";

const CallButton = ({
  toggleCall,
  callStatus,
}: Partial<ReturnType<typeof useVapi>>) => {
  return (
    <button
      className={`transition ease-in-out ${
        callStatus === CALL_STATUS.ACTIVE
          ? "m-1 mr-4 ms-auto rounded-[150px] bg-[#EE3314] p-3"
          : "m-1 mr-4 ms-auto rounded-[150px] bg-[#0044E1] p-3"
      } flex items-center justify-center`}
      onClick={toggleCall}
    >
      {callStatus === CALL_STATUS.ACTIVE && (
        <PhoneOff color="white" size={15} />
      )}
      {callStatus === CALL_STATUS.LOADING && (
        <Loader2 color="white" size={15} className="animate-spin" />
      )}
      {callStatus === CALL_STATUS.INACTIVE && (
        <PhoneOutgoing color="white" size={15} />
      )}
    </button>
  );
};

export default CallButton;
