import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
  TranscriptMessageTypeEnum,
} from "@/lib/types/vapi.type";
import { useEffect, useState } from "react";
import { vapi } from "@/lib/vapi"

export enum CALL_STATUS {
  INACTIVE = "inactive",
  ACTIVE = "active",
  LOADING = "loading",
}

interface VapiOptions {
    toggledLanguage: string
}

export function useVapi({ toggledLanguage } : VapiOptions) {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(
    CALL_STATUS.INACTIVE
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const [activeTranscript, setActiveTranscript] = useState<TranscriptMessage | null>(null);

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

    const onVolumeLevel = (volume: number) => {
      setAudioLevel(volume);
    };

    const onMessageUpdate = (message: Message) => {
      console.log("message", message);
      if (
        message.type === MessageTypeEnum.TRANSCRIPT &&
        message.transcriptType === TranscriptMessageTypeEnum.PARTIAL
      ) {
        setActiveTranscript(message);
      } else {
        setMessages((prev) => [...prev, message]);
        setActiveTranscript(null);
      }
    };

    const onError = (e: any) => {
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
    const response = vapi.start({
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [{ role: "system", content: "You are an assistant."}],
        },
        voice: {
          provider: "azure",
          voiceId: toggledLanguage === "SPANISH" ? "es-MX-CecilioNeural" : "andrew",
        },
        endCallFunctionEnabled: true
      });

    response.then((res) => {
      console.log("call successful");
    });
  };

  const stop = () => {
    setCallStatus(CALL_STATUS.LOADING);
    vapi.stop();
  };

  const toggleCall = () => {
    if (callStatus == CALL_STATUS.ACTIVE) {
      stop();
    } else {
      start();
    }
  };

  return {
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    start,
    stop,
    toggleCall,
  };
}
