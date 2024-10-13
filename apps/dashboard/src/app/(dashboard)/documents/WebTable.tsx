"use client";
import { Button, Table, Space, Tooltip, Spin } from "antd";
import {
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import React from "react";
import { ClientWebsite } from "./types";
import { api } from "~/server/trpc/clients/react";
import "./WebTable.css";
import { JobStatus } from "@syntag/db";

const statusToIcon: Record<JobStatus, React.ReactNode> = {
  ENQUEUE: <Spin style={{ fontSize: "20px" }} />,
  READY: <CheckCircleOutlined style={{ fontSize: "20px" }} />,
  FAILED: <ExclamationCircleOutlined style={{ fontSize: "20px" }} />,
  IN_PROGRESS: <Spin style={{ fontSize: "20px" }} />,
};

export default function WebTable(props: { clientWebsites: ClientWebsite[] }) {
  const clientWebsitesQuery = api.knowledge.getClientWebsites.useQuery(void 0, {
    initialData: props.clientWebsites,
    refetchInterval: 10000,
  });

  const utils = api.useUtils();
  const updateMutation = api.knowledge.ingestWebsite.useMutation();
  const deleteMutation = api.knowledge.deleteWebsite.useMutation();

  const handleRetryUpdate = async (url: string) => {
    const optimisticWebsites = props.clientWebsites.map((f) =>
      f.url === url ? { ...f, status: "ENQUEUE" as const } : f,
    );
    console.log(optimisticWebsites);
    if (optimisticWebsites) {
      utils.knowledge.getClientWebsites.setData(void 0, optimisticWebsites);
    }

    await updateMutation.mutateAsync(
      { url: url, crawl: true },
      {
        onSuccess: (data) => {
          utils.knowledge.getClientWebsites.setData(void 0, data);
          void utils.knowledge.getClientWebsites.invalidate();
        },
      },
    );
  };

  const handleDelete = async (knowledge_uuid: string) => {
    const optimisticWebsites = utils.knowledge.getClientWebsites
      .getData()
      ?.filter((file) => file.knowledge_uuid !== knowledge_uuid);
    if (optimisticWebsites) {
      utils.knowledge.getClientWebsites.setData(void 0, optimisticWebsites);
    }

    await deleteMutation.mutateAsync(
      { knowledge_uuid: knowledge_uuid },
      {
        onSuccess: (newWebsites) => {
          utils.knowledge.getClientWebsites.setData(void 0, newWebsites);
        },
      },
    );
  };

  return (
    <Table
      dataSource={clientWebsitesQuery.data}
      showSorterTooltip={{ target: "sorter-icon" }}
      pagination={false} // Disable pagination for better mobile view
      className="web-table" // Add a class for responsive styling
    >
      <Table.Column
        showSorterTooltip={{ target: "full-header" }}
        title="URL"
        dataIndex="url"
        key="url"
        render={(url: string) => <span>{url}</span>}
      />
      <Table.Column
        title="Last Updated"
        dataIndex="updatedAt"
        key="updatedAt"
        render={(text, record: ClientWebsite) => (
          <span>{record.updatedAt.toLocaleDateString()}</span>
        )}
      />
      <Table.Column
        title="Status"
        dataIndex="status"
        key="status"
        className="actions-column"
        render={(status: string) => (
          <Space style={{ display: "flex", justifyContent: "center" }}>
            {statusToIcon[status as JobStatus]}
          </Space>
        )}
      />
      <Table.Column
        className="actions-column"
        title="Actions"
        key="actions"
        render={(text, record: ClientWebsite) => (
          <div className="actions-container">
            <div className="desktop-actions">
              <Space
                direction="horizontal"
                size="small"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Tooltip title="View">
                  <Button
                    type="link"
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EyeOutlined style={{ fontSize: "20px", margin: "auto" }} />
                  </Button>
                </Tooltip>
                <Tooltip title="Retry Now">
                  <Button
                    type="link"
                    onClick={() => handleRetryUpdate(record.url)}
                  >
                    <ReloadOutlined
                      style={{ fontSize: "20px", margin: "auto" }}
                    />
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button
                    type="link"
                    style={{ color: "red" }}
                    onClick={async () => handleDelete(record.knowledge_uuid)}
                  >
                    <DeleteOutlined
                      style={{ fontSize: "20px", color: "red", margin: "auto" }}
                    />
                  </Button>
                </Tooltip>
              </Space>
            </div>
            <div className="mobile-actions">
              <Space
                direction="vertical"
                size="small"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Tooltip title="View">
                  <Button
                    type="link"
                    href={record.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EyeOutlined style={{ fontSize: "20px", margin: "auto" }} />
                  </Button>
                </Tooltip>
                <Tooltip title="Retry Now">
                  <Button
                    type="link"
                    onClick={() => handleRetryUpdate(record.url)}
                  >
                    <ReloadOutlined
                      style={{ fontSize: "20px", margin: "auto" }}
                    />
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button
                    type="link"
                    style={{ color: "red" }}
                    onClick={async () => handleDelete(record.knowledge_uuid)}
                  >
                    <DeleteOutlined
                      style={{ fontSize: "20px", color: "red", margin: "auto" }}
                    />
                  </Button>
                </Tooltip>
              </Space>
            </div>
          </div>
        )}
      />
    </Table>
  );
}
