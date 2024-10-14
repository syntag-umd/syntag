"use client";

import React from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import Navbar from "../_layout/Navbar";
import Sidebar from "../_layout/sidebar/Sidebar";
import themeConfig from "~/styles/themeConfig";
import { useTheme } from "next-themes";
import { MAIN_ID } from "../constants";

export default function ClientLayout(props: { children: React.ReactNode }) {
  const { defaultAlgorithm, darkAlgorithm } = antdTheme;
  const { resolvedTheme } = useTheme();
  return (
    <ConfigProvider
      theme={{
        ...themeConfig,
        algorithm: resolvedTheme === "dark" ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <div className="flex h-[100vh]">
        <Sidebar />
        <div className="relative m-3 w-full flex-col overflow-hidden">
          <Navbar />
          <main
            id={MAIN_ID}
            className="h-full max-w-[100vw] flex-1 overflow-auto p-4 pb-14 pt-4 max-[400px]:px-2"
          >
            {props.children}
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}
