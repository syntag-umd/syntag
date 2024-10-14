"use client";

import { DialogContent, Dialog, DialogTrigger } from "@/components/ui/dialog";
import FileUpload from "./FileUpload";
import { Button } from "~/components/ui/button";
import { Tabs } from "antd";
import WebUpload from "./WebUpload";
import { useState } from "react";

export default function UploadModal() {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-lg">Upload</Button>
      </DialogTrigger>
      <DialogContent>
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              label: "Files",
              key: "1",
              children: <FileUpload onUploadSuccess={() => setOpen(false)} />,
            },
            {
              label: "Websites",
              key: "2",
              children: <WebUpload onUploadSuccess={() => setOpen(false)} />,
            },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}
