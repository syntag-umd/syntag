"use client";

import React, { useState, useEffect } from "react";
import AIChatBox from "./ChatBox";
import { Button } from "./ui/button";
import { Bot } from "lucide-react";
import {
  Popover,
  PopoverContent,
  Text,
  PopoverArrow,
  PopoverCloseButton,
  PopoverBody,
  PopoverTrigger,
  Portal,
} from "@chakra-ui/react";

const AIChatButton = () => {
  const [chatBoxOpen, setChatBoxOpen] = useState(false);
  const [isOpen, setOpen] = useState(true);

  const [language, setLanguage] = useState("EN"); // Start with English
  const messages: { [key: string]: string } = {
    EN: "Have any doubts? Come talk to me.",
    ES: "¿Tienes alguna duda? Ven a hablar conmigo.",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLanguage((prevLang) => (prevLang === "EN" ? "ES" : "EN"));
    }, 3000); // Change language every 3 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  return (
    <>
      <Popover
        defaultIsOpen={true}
        closeOnBlur={false}
        autoFocus={false}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        placement="left"
      >
        <PopoverTrigger>
          <Button
            onClick={() => setChatBoxOpen(true)}
            className="absolute bottom-6 right-4 h-14 w-14 cursor-pointer rounded-full bg-gradient-to-r from-[#4389d5] to-[#0044E1] md:bottom-10 md:right-10"
          >
            <Bot size={25} className="animate-pulse" />
          </Button>
        </PopoverTrigger>
        <Portal>
          <PopoverContent>
            <PopoverArrow />
            <PopoverBody m={1} mr={2}>
              <PopoverCloseButton mt={2} ml={1} />
              <Text fontSize="sm">{messages[language]}</Text>
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
      <AIChatBox open={chatBoxOpen} onClose={() => setChatBoxOpen(false)} />
    </>
  );
};

export default AIChatButton;
