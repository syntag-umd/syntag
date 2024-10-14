"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, type ReactNode } from "react";

import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTheme } from "next-themes";

type SidebarProps = {
  href: string;
  theme: string | undefined;
  children: ReactNode;
};

export default function Sidebar() {
  const { resolvedTheme: theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`bg-card text-foreground h-full w-full  min-w-[90px] max-w-[250px] rounded-xl p-4 py-5`}
    >
      <SidebarLink href="/voice-agent" theme={theme}>
        <DashboardIcon className="w-30 mr-4" />
        <div className="hidden w-auto lg:block">Voice Agents</div>
      </SidebarLink>
      <SidebarLink href="/settings" theme={theme}>
        <SettingsIcon className="w-30 mr-4" />
        <div className="hidden w-auto lg:block">Settings</div>
      </SidebarLink>
    </div>
  );
}

export function SidebarLink({ href, theme, children }: SidebarProps) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      prefetch={true}
      className={`text-foreground m-1 flex flex-row rounded-lg p-3 ${
        theme === "light"
          ? pathname === href
            ? " bg-neutral-100 hover:bg-neutral-100"
            : "hover:bg-neutral-50"
          : pathname === href
            ? "bg-neutral-800 hover:bg-neutral-800"
            : "hover:bg-neutral-900"
      }`}
    >
      {children}
    </Link>
  );
}
