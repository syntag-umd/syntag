import React from "react";
import FileTable from "./FileTable";
import { api } from "~/server/trpc/clients/server";
import UploadModal from "./UploadModal";
import { Tabs } from "antd";
import WebTable from "./WebTable";
function abbreviateNumber(num: number, decimalPlaces = 2) {
  const factor = Math.pow(10, decimalPlaces);

  if (num >= 1e9) {
    return Math.floor((num / 1e9) * factor) / factor + "B";
  } else if (num >= 1e6) {
    return Math.floor((num / 1e6) * factor) / factor + "M";
  } else if (num >= 1e3) {
    return Math.floor((num / 1e3) * factor) / factor + "K";
  } else {
    return num.toString();
  }
}

export default async function page() {
  const [user, clientFiles, clientWebsites] = await Promise.all([
    api.user.get(),
    api.knowledge.getClientDocuments(),
    api.knowledge.getClientWebsites(),
  ]);

  return (
    <div className="lg:pr-[10vw]">
      <div className="flex h-fit justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Documents</h1>
          <p className="mb-6 opacity-75">
            Add files or websites that contain information the receptionists
            should know.
            <br />
            <span>
              Only text is extracted from files and images. There isn&apos;t
              visual understanding.
            </span>
          </p>
        </div>
        <div className="m-5 mr-0 flex flex-col">
          <UploadModal />
          <small className="text-pretty text-right text-xs text-gray-500">
            {user && `${abbreviateNumber(user?.embedding_tokens)} `}
            free
            <br />
            tokens left
          </small>
        </div>
      </div>
      <div>
        <Tabs
          items={[
            {
              label: "Files",
              key: "1",
              children: <FileTable clientFiles={clientFiles} />,
            },
            {
              label: "Websites",
              key: "2",
              children: (
                <div>
                  <WebTable clientWebsites={clientWebsites} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
