"use client";
import React, { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Loading from "./loading";
import { env } from "~/env";
import { syntagSignOut } from "~/app/ClerkProvider";

export default function PageClient() {
  const user = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [state, setState] = React.useState("");
  useEffect(() => {
    const checkUserStatus = async () => {
      for (let i = 0; i < 10; i++) {
        await user.user?.reload();
        if (user.user?.externalId) {
          router.push(env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL);
        }
        await auth.getToken({ skipCache: true });
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      setState(
        "Failed to create user. Try refreshing your page, or signing out.",
      );
    };
    if (user.user?.externalId) {
      router.push(env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL);
    }
    checkUserStatus().catch(() => {
      setState(
        "Failed to create user. Try refreshing your page, or signing out.",
      );
    });
  }, [router, user, auth]);

  if (user.user?.externalId) {
    router.push(env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL);
  }
  return (
    <div>
      {state === "" ? (
        <Loading />
      ) : (
        <div className="pt-[10vh] text-center">
          <h2 className="mb-4">
            Failed to create user. Try refreshing your page, or signing out.
          </h2>
          <button
            className="border-2 border-solid border-input p-4"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
          <button
            className="border-2 border-solid border-input p-4"
            onClick={() => syntagSignOut(auth.signOut)}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
