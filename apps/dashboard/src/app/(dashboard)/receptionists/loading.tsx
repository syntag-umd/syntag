import { Skeleton } from "@/components/ui/skeleton";

export default function loading() {
  return (
    <>
      <div className="mb-5 flex justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">AI Receptionists</h1>
          <p className="mb-6 opacity-75">
            Configure custom AI AsReceptionistssistants
          </p>
        </div>
        <div className="m-5">
          <Skeleton className="h-[40px] w-[150px] rounded-[10px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-[125px] w-full rounded-[10px] xl:w-[340px]" />
        <Skeleton className="h-[125px] w-full rounded-[10px] xl:w-[340px]" />
        <Skeleton className="h-[125px] w-full rounded-[10px] xl:w-[340px]" />
      </div>
    </>
  );
}
