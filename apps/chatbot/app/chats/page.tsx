"use client"

import { useEffect, useState } from 'react';
import { Box, Text } from "@chakra-ui/react";
import Highlight, { defaultProps, Language } from "prism-react-renderer";
import theme from "prism-react-renderer/themes/nightOwl";
import AIChatButton from "@/components/ChatButton";

interface PrismHighlightProps {
  code: string;
  language: Language;
}

const PrismHighlight = ({ code, language }:{ code: string; language: Language }) => (
  <Highlight {...defaultProps} theme={theme} code={code} language={language} >
    {({ className, style, tokens, getLineProps, getTokenProps }) => (
      <Text
        as="pre"
        p="3"
        whiteSpace="pre"
        borderRadius="5"
        overflowY="hidden"
        _hover={{ overflowY: "scroll" }}
        className={className}
        style={style}
      >
        {tokens.map((line, i) => (
          <div key={i} {...getLineProps({ line })}>
            {line.map((token, key) => (
              <span key={key} {...getTokenProps({ token })} />
            ))}
          </div>
        ))}
      </Text>
    )}
  </Highlight>
);

const ChatsPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Box>
      {/* {isClient && (
        <PrismHighlight code={`<iframe src="${window.location.origin}/embed-ai-chat-bot" style="width: 100%; height: 100vh; border: 0;"></iframe>`} language="markup" />
      )} */}
      <AIChatButton />
    </Box>
  );
};

export default ChatsPage;