"use client";

import React, { useState } from "react";
import { SidebarLinks } from "./SidebarLinks";
import { navItems } from "~/app/constants";
import { cn } from "~/lib/utils";
import { useSidebar } from "./useSidebar";
import Link from "next/link";
import Image from "next/image";
import logoName from "~/../public/logo_name.png";
import logo from "~/../public/logo.svg";

type SidebarProps = {
  className?: string;
};

export default function Sidebar({ className }: SidebarProps) {
  const { isMinimized, toggle } = useSidebar();
  const [status, setStatus] = useState(false);

  const handleToggle = () => {
    setStatus(true);
    toggle();
    setTimeout(() => setStatus(false), 500);
  };
  return (
    <nav
      className={cn(
        `sticky top-0 hidden h-auto min-h-main-height flex-none border-r border-accent pt-5 md:block`,
        status && "duration-500",
        !isMinimized ? "w-56" : "w-[72px]",
        className,
      )}
      onMouseEnter={() => handleToggle()}
      onMouseLeave={() => handleToggle()}
    >
      <div className="space-y-1 px-3 py-2">
        <Link href={"/"} className="block h-12 pr-4">
          <Image
            src={logo}
            alt="logo"
            className={`ml-2 ${isMinimized ? "block" : "hidden"}`}
            width={30}
            height={30}
          />
          <Image
            src={logoName}
            alt="logo"
            className={`ml-4 pt-1 ${isMinimized ? "hidden" : "block"}`}
            width={4.125 * 24}
            height={24}
          />
        </Link>
        <SidebarLinks items={navItems} />
      </div>
    </nav>
  );
}
