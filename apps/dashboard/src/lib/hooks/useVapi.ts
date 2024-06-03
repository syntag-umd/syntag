  import { useEffect, useState } from "react";
  import { vapi } from "~/lib/vapi"
  
  export enum CALL_STATUS {
    INACTIVE = "inactive",
    ACTIVE = "active",
    LOADING = "loading",
  }
  
  export function useVapi(assistantId : string) {
    const [isSpeechActive, setIsSpeechActive] = useState(false);
    const [callStatus, setCallStatus] = useState<CALL_STATUS>(
      CALL_STATUS.INACTIVE
    );
      
    const [audioLevel, setAudioLevel] = useState(0);
  
    useEffect(() => {
      const onSpeechStart = () => setIsSpeechActive(true);
      const onSpeechEnd = () => {
        setIsSpeechActive(false);
      };
  
      const onCallStartHandler = () => {
        setCallStatus(CALL_STATUS.ACTIVE);
      };
  
      const onCallEnd = () => {
        setCallStatus(CALL_STATUS.INACTIVE);
      };
  
      const onError = (e: unknown) => {
        setCallStatus(CALL_STATUS.INACTIVE);
        console.error(e);
      };
  
      vapi.on("call-start", onCallStartHandler);
      vapi.on("call-end", onCallEnd);
      vapi.on("error", onError);
  
      return () => {
        vapi.off("call-start", onCallStartHandler);
        vapi.off("call-end", onCallEnd);
        vapi.off("error", onError);
      };
    }, []);
  
    const start = async () => {
      setCallStatus(CALL_STATUS.LOADING);
      const response = await vapi.start(assistantId);
      if (response) {
        console.log("call successful")
      }
    };
  
    const stop = () => {
      setCallStatus(CALL_STATUS.LOADING);
      vapi.stop();
    };
  
    const toggleCall = () => {
      if (callStatus == CALL_STATUS.ACTIVE) {
        stop();
      } else {
        void start();
      }
    };
  
    return {
      isSpeechActive,
      callStatus,
      audioLevel,
      start,
      stop,
      toggleCall,
    };
  }