"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import logo from "~/../public/logo.png";
import { Link } from "@chakra-ui/next-js";
import { UserButton } from "@clerk/nextjs";
import { Box, Flex, Stack } from "@chakra-ui/react";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";

export default function Navbar() {
  const { resolvedTheme: theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }

  return (
    <Box px={4} className="bg-card">
      <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
        <Link href={"/"} className="relative ml-5">
          <Image src={logo} alt="logo" width={4.125 * 28} height={28} />
        </Link>
        <Flex alignItems={"center"}>
          <Stack direction={"row"} spacing={7}>
            <div className="items-center space-x-6 md:flex">
              <Link
                href="https://docs.syntag.org/introduction"
                target="_blank"
                rel="noopener noreferrer"
              >
                docs
              </Link>
              <Button
                onClick={() => {
                  if (theme === "light") {
                    setTheme("dark");
                  } else {
                    setTheme("light");
                  }
                }}
                variant={"secondary"}
                size={"sm"}
                className="hover:bg-secondary-hover "
              >
                {theme === "dark" ? (
                  <MdDarkMode size={"1.125rem"} />
                ) : (
                  <MdLightMode size={"1.125rem"} color="var(--foreground)" />
                )}
              </Button>
              <UserButton />
            </div>
          </Stack>
        </Flex>
      </Flex>
    </Box>
  );
}
