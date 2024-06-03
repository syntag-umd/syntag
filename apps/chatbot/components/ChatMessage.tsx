import { cn } from "@/lib/utils";
import { Message } from "ai";
import { Bot } from "lucide-react";
import React from "react";
import Image from 'next/image';



function ChatMessage({ message: { role, content } }: { message: Pick<Message, "role" | "content"> }) {

    const isAiMessage = role === "assistant"
  
    return (
      <div className={cn('mb-3 flex items-center', isAiMessage ? "me-5 justify-start" : "ms-5 justify-end")}>
        {isAiMessage && <Bot className='mr-2 shrink-0' />}
        <p className={cn(
          "whitespace-pre-line rounded-md border px-3 py-2", isAiMessage ? "bg-white" : "bg-[#0044E1] text-primary-foreground"
        )}>
          {content}
        </p>
        {
          !isAiMessage && (
            <Image
              src={"https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"}
              alt="User Image"
              width={80}
              height={80}
              className='ml-2 rounded-full w-8 h-8 object-cover'
            />
          )
        }
      </div>
    )
  }

export default ChatMessage;