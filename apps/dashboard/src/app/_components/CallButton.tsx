import { Loader2 } from "lucide-react";
import { CALL_STATUS, type useVapi } from "@syntag/vapi/useVapi";
import { Button } from "~/components/ui/button";
import { useState } from "react";

const CallButton = ({
    toggleCall,
    callStatus,
  }: Partial<ReturnType<typeof useVapi>>) => {
    const [selected, setSelected] = useState(false);

    return (
        <Button
            onClick={toggleCall}
            onClickCapture={() => setSelected(!selected)}
            size={"sm"}
            className="mx-2"
        >
            { (callStatus === CALL_STATUS.ACTIVE && selected) ? "End Call"
            : (callStatus === CALL_STATUS.LOADING && selected) ? (<Loader2 color='white' size={15} className="animate-spin" />) 
            : "Call"}
        </Button>
    );
}

export default CallButton