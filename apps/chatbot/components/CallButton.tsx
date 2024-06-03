import { PhoneOff, PhoneOutgoing, Loader2 } from "lucide-react";
import { CALL_STATUS, useVapi } from "@/app/hooks/useVapi";

const CallButton = ({
    toggleCall,
    callStatus,
  }: Partial<ReturnType<typeof useVapi>>) => {

    return (
        <button
            className={`transition ease-in-out ${
            callStatus === CALL_STATUS.ACTIVE
                ? "bg-[#EE3314] rounded-[150px] ms-auto p-3 m-1 mr-4"
                : "bg-[#0044E1] rounded-[150px] ms-auto p-3 m-1 mr-4"
            } flex items-center justify-center`}
            onClick={toggleCall}
        >
            {callStatus === CALL_STATUS.ACTIVE ? (<PhoneOff color='white' size={15}/>) 
            : callStatus === CALL_STATUS.LOADING ? (<Loader2 color='white' size={15} className="animate-spin" />) 
            : (<PhoneOutgoing color='white' size={15}/>)}
        </button>
    );
}

export default CallButton