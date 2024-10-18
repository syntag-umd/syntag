"use client";

import React, { useEffect, useState } from "react";
import { Card, List, Button, Switch, Tooltip, Modal, Typography } from "antd";
import {
  FilePdfOutlined,
  FileWordOutlined,
  FileOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import FileUpload from "../../documents/FileUpload";
import { api } from "~/server/trpc/clients/react";
import Link from "~/components/ui/Link";
import dynamic from "next/dynamic";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSignedUrl } from "../../documents/action";
import { useAgent } from "../AgentContext";

const { Text } = Typography;

const FilePreview = dynamic(() => import("../../documents/FilePreview"), {
  loading: () => <p>Getting your file...</p>,
  ssr: false,
});

interface FileData {
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  knowledge_uuid: string;
  gcloud_name: string;
}

const DocumentsCard = () => {
  const [fileData, setFileData] = useState<FileData[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const clientFilesQuery = api.knowledge.getClientDocuments.useQuery(void 0, {
    placeholderData: (prev) => prev,
  });

  const { agentResponse } = useAgent();

  const updateAgentKnowledgeMutation = api.agent.update.useMutation();

  useEffect(() => {
    if (clientFilesQuery.data && agentResponse) {
      const enabledFiles = agentResponse.knowledge.map((kn) => kn.uuid);
      const files = clientFilesQuery.data.map((file) => ({
        name: file.displayName,
        icon: selectIcon(file.displayName),
        enabled: enabledFiles.includes(file.knowledge_uuid),
        knowledge_uuid: file.knowledge_uuid,
        gcloud_name: file.gcloud_name,
      }));
      setFileData(files);
    }
  }, [clientFilesQuery.data, agentResponse]);

  const selectIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FilePdfOutlined />;
      case "docx":
        return <FileWordOutlined />;
      case "doc":
        return <FileWordOutlined />;
      default:
        return <FileOutlined />;
    }
  };

  const toggleFileEnabled = (file: FileData, enabled: boolean) => {
    setFileData((prevData) =>
      prevData.map((f) => (f.name === file.name ? { ...f, enabled } : f)),
    );

    const updatedSelectedKnowledge = enabled
      ? [...agentResponse!.knowledge.map((kn) => kn.uuid), file.knowledge_uuid]
      : agentResponse!.knowledge
          .map((kn) => kn.uuid)
          .filter((uuid) => uuid !== file.knowledge_uuid);

    updateAgentKnowledgeMutation.mutate({
      voice_assistant_uuid: agentResponse!.voice_assistant.uuid,
      selectedKnowledge: updatedSelectedKnowledge,
    });
  };

  const openPreview = (file: FileData) => {
    const signedUrl = getSignedUrl(file.gcloud_name);

    void signedUrl.then((url) => {
      setPreviewUrl(url);
      setPreviewOpen(true);
    });
  };

  return (
    <>
      <Card
        title={
          <div style={{ paddingTop: "12px", paddingBottom: "12px" }}>
            <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              Documents
            </Text>
            <p></p>
            <Text type="secondary" style={{ fontWeight: "normal" }}>
              Upload and manage document files for{" "}
              {agentResponse?.voice_assistant.name} to reference in their
              responses.
            </Text>
          </div>
        }
        extra={
          <Link href="/documents" style={{ textDecoration: "none" }}>
            <Text style={{ fontSize: "16px", color: "var(--primary)" }}>
              View All
            </Text>
          </Link>
        }
        style={{ width: "100%" }}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Upload New
          </Button>
        </div>
        <List
          itemLayout="horizontal"
          dataSource={fileData}
          renderItem={(item, index) => (
            <List.Item
              key={index}
              actions={[
                <Tooltip
                  title={`Add ${item.name} to ${agentResponse?.voice_assistant.name}'s knowledge`}
                  key={0}
                >
                  <Switch
                    checked={item.enabled}
                    onChange={(checked) => toggleFileEnabled(item, checked)}
                  />
                </Tooltip>,
                <Button
                  type="link"
                  icon={
                    <ArrowRightOutlined style={{ color: "var(--primary)" }} />
                  }
                  key={1}
                  onClick={() => openPreview(item)}
                />,
              ]}
            >
              <List.Item.Meta avatar={item.icon} title={item.name} />
            </List.Item>
          )}
        />
      </Card>

      {/* Modal for FileUpload */}
      <Modal
        title="Upload Files"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <FileUpload onUploadSuccess={() => setOpen(false)} />
      </Modal>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-full max-w-xl overflow-scroll p-0">
          <FilePreview url={previewUrl} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentsCard;
