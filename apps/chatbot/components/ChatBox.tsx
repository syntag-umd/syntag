import { cn } from '@/lib/utils';
import { generateId } from '@/app/services/conversation';
import { useChat } from 'ai/react';
import { Bot, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useEffect, useRef, useState } from 'react';
import { Stack, Avatar, Text, AvatarBadge } from '@chakra-ui/react';
import ChatMessage from './ChatMessage';
import ResolutionModal from './ResolutionModal';
import { CALL_STATUS, useVapi } from '@syntag/vapi/web/useVapi';
import CallButton from './CallButton';


interface AIChatBoxProps {
  open: boolean,
  onClose: () => void,
}

const AIChatBox = ({ open, onClose }: AIChatBoxProps) => {
  
  const [toggledLanguage, setToggledLanguage] = useState<string>("ENGLISH");
  const [chatLanguage, setChatLanguage] = useState<string>("");
  const [id, setId] = useState<string>("");

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, error } = useChat();
  // const { toggleCall, callStatus } = useVapi({toggledLanguage});
  const { toggleCall, callStatus } = useVapi("f0e49a91-90cd-4299-96e7-9c4e87b46d6b");

  const [modal, setModal] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const lastMessageIsUser = messages[messages.length - 1]?.role === "user";

  const setChatOptions = (newId: string) => {
    return {
      options: {
          body: {
          "language": toggledLanguage,
          "id": newId,
        }
      }
    };
  }

  return (
    <div
      className={cn('bottom-0 right-0 md:right-2 md:bottom-2 z-10 h-full md:h-auto w-full max-w-[500px] rounded-xl overflow-hidden shadow-xl', open ? "fixed" : "hidden")}
    >
      <Stack direction="column" className="relative h-full md:h-[600px] bg-[#F8F8FE]"> 
        <ResolutionModal open={modal} onClose={() => setModal(false)}/>
        <div className="bg-white"> 
          <button onClick={onClose} className='mb-1 ms-auto block p-3'>
              <X color="gray" size={20} />
          </button>  
          <Stack direction="row" className="m-5 mt-0">
            <Avatar name='Jacob' src='https://bit.ly/dan-abramov'>
              <AvatarBadge boxSize='1em' className="bg-[#62C58F]" />
            </Avatar>
            <Stack direction="column" className="mt-1" spacing={0}>
              <Text fontWeight={"bold"}>Jacob</Text>
              <Text className="text-[#A8A8A8]" fontSize="xs">{(callStatus === CALL_STATUS.ACTIVE) ? "talking..." : (callStatus === CALL_STATUS.LOADING) ? "connecting..." : "is available to talk"}</Text>
            </Stack>
            <CallButton
              callStatus={callStatus}
              toggleCall={toggleCall}
            />
          </Stack>
        </div>
        <div>
          <Text fontSize="sm" className="text-[#808080] text-center m-3" >
            In what language should we talk in?
          </Text>
          <Stack direction="row" className="justify-center">
            <button onClick={() => setToggledLanguage("ENGLISH")} className={cn('rounded-full p-1 pl-6 pr-6 m-1 text-xs h-[30px] shadow-sm font-semibold', (toggledLanguage == "ENGLISH") ? "bg-[#0044E1] text-white" : "bg-white text-[#808080]")}>
                English
            </button>
            <button onClick={() => setToggledLanguage("SPANISH")} className={cn('rounded-full p-1 pl-6 pr-6 m-1 text-xs h-[30px] shadow-sm font-semibold', (toggledLanguage == "SPANISH") ? "bg-[#0044E1] text-white" : "bg-white text-[#808080]")}>
                Spanish
            </button>
          </Stack>
        </div>
        <div className='h-full p-3 overflow-y-auto' ref={scrollRef}>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {
            isLoading && lastMessageIsUser && (
              <ChatMessage
                message={{
                  role: "assistant",
                  content: "Thinking..."
                }}
              />
            )
          }
          {
            error && (
              <ChatMessage
                message={{
                  role: "assistant",
                  content: "Something went wrong"
                }}
              />
            )
          }
          {
            !error && messages.length === 0 && (
              <div className='h-full flex items-center justify-center gap-3'>
                <Bot />
                Ask me anything!
              </div>
            )
          }
        </div>
        <div className='bg-white'>
          <form onSubmit={(e) => {
              e.preventDefault();
              if(chatLanguage != toggledLanguage ) {
                generateId(toggledLanguage).then(newId => {
                  setId(newId);
                  handleSubmit(e, setChatOptions(newId));  
                });
                setChatLanguage(toggledLanguage);
              } else {                   
                handleSubmit(e, setChatOptions(id));
              }
            }} className='pl-2 m-3 flex gap-2'>
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder='Type here...'
              ref={inputRef}
            />
            <Button
              variant='outline'
              type='button'
              onClick={() => setMessages([])}
            >
              <Text>Clear Chat</Text>
            </Button>
          </form>
        </div> 
      </Stack>
    </div>
  )
}

export default AIChatBox