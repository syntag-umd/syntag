import React from "react";
import { Skeleton } from "~/components/ui/skeleton";

export default function loading() {
  return (
    <div className={"flex items-center justify-between h-14" }>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
