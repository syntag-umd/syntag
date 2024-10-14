"use client";
import { Loader2 } from "lucide-react";
import { CALL_STATUS, useVapi } from "@syntag/vapi/web/useVapi";
import { Button } from "antd";
import { useState } from "react";

export const CallButton = ({
  toggleCall,
  callStatus,
  name,
}: Partial<ReturnType<typeof useVapi>> & { name?: string }) => {
  const [selected, setSelected] = useState(false);

  return (
    <Button
      onClick={toggleCall}
      onClickCapture={() => setSelected(!selected)}
      size="large"
      style={{ fontSize: '1rem', padding: '20px', borderRadius: '6px' }}
      type="primary"
      className="m-1"
    >
      {callStatus === CALL_STATUS.ACTIVE && selected ? (
        "End Call"
      ) : callStatus === CALL_STATUS.LOADING && selected ? (
        <Loader2 color="white" size={15} className="animate-spin" />
      ) : (
        `Call${name ? ` ${name}` : ""}`
      )}
    </Button>
  );
};

export const CallButtonWrapped = (props: {
  vapi_assistant_id: string;
  name?: string;
}) => {
  const { toggleCall, callStatus } = useVapi(props.vapi_assistant_id);
  return (
    <CallButton
      toggleCall={toggleCall}
      callStatus={callStatus}
      name={props.name}
    />
  );
};
