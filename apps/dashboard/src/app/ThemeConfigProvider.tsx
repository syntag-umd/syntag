"use client";
import React from "react";
import { useTheme } from "next-themes";
import themeConfig from "~/styles/themeConfig";
import { ConfigProvider, theme as antdTheme } from "antd";

export default function ThemeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { defaultAlgorithm, darkAlgorithm } = antdTheme;
  const { resolvedTheme } = useTheme();
  return (
    <ConfigProvider
      theme={{
        ...themeConfig,
        algorithm: resolvedTheme === "dark" ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
