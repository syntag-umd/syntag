"use client";

import {
  ChakraProvider,
  extendTheme,
  type ThemeConfig,
} from "@chakra-ui/react";

const config: ThemeConfig = {};

const theme = extendTheme({
  colors: { brand: "var(--primary)" },
  config,
});

import React from "react";

export default function MyChakraProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </>
  );
}
