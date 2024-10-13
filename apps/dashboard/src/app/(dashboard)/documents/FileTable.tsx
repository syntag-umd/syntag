"use client";

import { useState } from "react";
import FileCard from "./FileCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import dynamic from "next/dynamic";

import { api } from "~/server/trpc/clients/react";
import { type ClientFile } from "./types";
import { Empty } from "antd";
const FilePreview = dynamic(() => import("./FilePreview"), {
  loading: () => <p>Getting your file...</p>,
  ssr: false,
});

export default function FileTable(props: { clientFiles: ClientFile[] }) {
  const clientFilesQuery = api.knowledge.getClientDocuments.useQuery(void 0, {
    initialData: props.clientFiles,
  });

  const [open, setOpen] = useState<boolean>(false);
  const [url, setUrl] = useState<string>("");

  const openPreview = (signedUrl: Promise<string>) => {
    void signedUrl.then((url) => setUrl(url));
    setOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-xl overflow-scroll p-0">
          <FilePreview url={url} />
        </DialogContent>
      </Dialog>

      <ul className="my-4 flex flex-wrap justify-center gap-4 md:justify-start">
        {clientFilesQuery.data.length > 0 ? (
          clientFilesQuery.data.map((file) => {
            return (
              <li key={file.knowledge_uuid}>
                <FileCard {...file} open={openPreview} />
              </li>
            );
          })
        ) : (
          <div className="w-full rounded bg-card">
            <Empty
              description="No files uploaded"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </ul>
    </>
  );
}
