"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { syntagSignOut } from "./ClerkProvider";
import { useRouter } from "next/navigation";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    try {
      console.error("Global error", error);
    } catch (e) {
      console.log("Can't catch global error", e);
    }
  }, [error]);
  const auth = useAuth();
  return (
    <html>
      <body>
        <div className="flex flex-col items-center">
          <h2 className="mb-2">Something went wrong!</h2>
          <div className="space-x-2">
            <Button
              onClick={() => {
                reset();
                router.refresh();
              }}
            >
              Try again
            </Button>
            <Button
              variant={"outline"}
              onClick={() => syntagSignOut(auth.signOut)}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
