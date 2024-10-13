"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ClerkProvider, useSession } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { BrowserAnalytics } from "./AnalyticsProvider";
import { type useAuth } from "@clerk/nextjs";
import { env } from "~/env";

export function Provider({ children }: ThemeProviderProps) {
  const { resolvedTheme } = useTheme();
  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        layout: {
          termsPageUrl: "https://syntag.ai/terms-of-service",
        },
      }}
    >
      <TrackUser>
        <AntdRegistry>{children}</AntdRegistry>
      </TrackUser>
    </ClerkProvider>
  );
}

function TrackUser({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, session } = useSession();
  React.useEffect(() => {
    const db_uuid = session?.user?.externalId ?? null;
    if (isLoaded && env.NEXT_PUBLIC_BROWSER_ANALYTICS === "TRUE") {
      void BrowserAnalytics.setUserId(db_uuid);
    }
  }, [isLoaded, isSignedIn, session]);

  return children;
}

type UseAuthReturnType = ReturnType<typeof useAuth>;
export async function syntagSignOut(
  clerk_signout?: UseAuthReturnType["signOut"],
) {
  try {
    if (env.NEXT_PUBLIC_BROWSER_ANALYTICS === "TRUE") {
      void BrowserAnalytics.setUserId(null);
    }
  } finally {
    if (clerk_signout) return clerk_signout();
  }
}
