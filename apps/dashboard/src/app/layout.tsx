import "~/styles/globals.css";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/server/trpc/clients/react";
import { ThemeProvider } from "next-themes";
import { Provider as ClerkProvider } from "./ClerkProvider";
import { env } from "~/env";
import HotjarInit from "./(dashboard)/HotjarInit";
import AnalyticsProvider from "./AnalyticsProvider";
import ThemeConfigProvider from "./ThemeConfigProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "SynTag Dashboard",
  description: "Control your receptionists",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${inter.variable} bg-background text-foreground`}
      >
        <AnalyticsProvider>
          {/* <HotjarInit /> */}
          <TRPCReactProvider>
            <ThemeProvider
              defaultTheme="system"
              enableSystem
              themes={["light", "dark"]}
              attribute="data-theme"
            >
              <ThemeConfigProvider>
                <ClerkProvider>{children}</ClerkProvider>
              </ThemeConfigProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
