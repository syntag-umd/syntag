"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons } from "@/components/Icons";
import { type NavItem } from "../types";
import { Dispatch, SetStateAction } from "react";

import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useSidebar } from "./useSidebar";

interface SidebarLinksProps {
  items: NavItem[];
  setOpen?: Dispatch<SetStateAction<boolean>>;
  isMobileNav?: boolean;
}

export function SidebarLinks({
  items,
  setOpen,
  isMobileNav = false,
}: SidebarLinksProps) {
  const path = usePathname();
  const { isMinimized } = useSidebar();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="grid items-start gap-2">
      <TooltipProvider>
        {items.map((item, index) => {
          const Icon = Icons[item.icon ?? "arrowRight"];
          return (
            item.href && (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.disabled ? "/" : item.href}
                    className={cn(
                      "flex items-center gap-2 overflow-hidden rounded-md py-2 text-sm font-normal hover:bg-accent hover:text-accent-foreground",
                      path === item.href
                        ? "bg-accent font-medium text-[--color-brand]"
                        : "transparent text-[--muted-foreground]",
                      item.disabled && "cursor-not-allowed opacity-80",
                    )}
                    onClick={() => {
                      if (setOpen) setOpen(false);
                    }}
                  >
                    <Icon className={`ml-3 size-5`} />

                    {isMobileNav || (!isMinimized && !isMobileNav) ? (
                      <span className="mr-2 truncate">{item.title}</span>
                    ) : (
                      ""
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  align="center"
                  side="right"
                  sideOffset={8}
                  className={!isMinimized ? "hidden" : "inline-block"}
                >
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          );
        })}
      </TooltipProvider>
    </nav>
  );
}
