"use client";
import React, { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Loading from "./loading";

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
          router.push("/");
        }
        await auth.getToken({ skipCache: true });
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      setState(
        "Failed to create user. Try refreshing your page, or signing out.",
      );
    };
    if (user.user?.externalId) {
      router.push("/");
    }
    checkUserStatus().catch(() => {
      setState(
        "Failed to create user. Try refreshing your page, or signing out.",
      );
    });
  }, [router, user, auth]);

  if (user.user?.externalId) {
    router.push("/");
  }
  return (
    <div>
      {state === "" ? (
        <Loading />
      ) : (
        <div>
          <h1>
            Failed to create user. Try refreshing your page, or signing out.
          </h1>
          <button
            className="border-2 border-solid border-white p-4"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
          <button
            className="border-2 border-solid border-white p-4"
            onClick={() => auth.signOut()}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
