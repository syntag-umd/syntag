import "~/styles/globals.css";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ClerkProvider } from "@clerk/nextjs";
import MyChakraProvider from "./MyChakraProvider";
import { ThemeProvider } from "./ThemeProvider";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "SynTag Dashboard",
  description: "Control your voice assistants",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`font-sans ${inter.variable} bg-background text-foreground`}
        >
          <TRPCReactProvider>
            <ThemeProvider
              defaultTheme="system"
              enableSystem
              themes={["light", "dark"]}
              attribute="data-theme"
            >
              <MyChakraProvider>{children}</MyChakraProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
