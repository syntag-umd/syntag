"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { getSignedUrl } from "./action";
import { CloseOutlined } from "@ant-design/icons";
import { type ClientFile } from "./types";
import { api } from "~/server/trpc/clients/react";

interface FileCardProps extends ClientFile {
  open: (signedUrl: Promise<string>) => void;
}

export default function FileCard(props: FileCardProps) {
  const utils = api.useUtils();

  const deleteMutation = api.knowledge.deleteDocument.useMutation();
  const handleDelete = async (knowledge_uuid: string) => {
    const optimisticFiles = utils.knowledge.getClientDocuments
      .getData()
      ?.filter((file) => file.knowledge_uuid !== knowledge_uuid);
    if (optimisticFiles) {
      utils.knowledge.getClientDocuments.setData(void 0, optimisticFiles);
    }

    await deleteMutation.mutateAsync(
      { knowledge_uuid: knowledge_uuid },
      {
        onSuccess: (newFiles) => {
          utils.knowledge.getClientDocuments.setData(void 0, newFiles);
        },
      },
    );
  };

  const signedUrl = async () => {
    return await getSignedUrl(props.gcloud_name);
  };

  return (
    <div className="p-auto flex w-60 justify-between rounded-lg bg-card p-2 md:w-48">
      <button
        className="m-2 truncate align-middle text-sm"
        onClick={() => props.open(signedUrl())}
      >
        {props.displayName}
      </button>
      <Button
        variant={"ghost"}
        size={"sm"}
        onClick={async () => handleDelete(props.knowledge_uuid)}
      >
        <CloseOutlined />
      </Button>
    </div>
  );
}
