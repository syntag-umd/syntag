"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ClientLayout from "./(dashboard)/ClientLayout";
export default function NotFound() {
  const pathname = usePathname();
  console.error(new Error("404: Not Found: " + pathname));
  return (
    <ClientLayout>
      <div className="flex w-full flex-col items-center gap-2 pt-[25vh]">
        <h2>404: Not Found</h2>
        <p>Could not find requested resource</p>
        <Link className="text-blue-500 underline" href="/">
          Return Home
        </Link>
      </div>
    </ClientLayout>
  );
}
