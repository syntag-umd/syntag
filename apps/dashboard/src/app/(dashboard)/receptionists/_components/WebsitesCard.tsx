"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  List,
  Button,
  Input,
  Spin,
  Switch,
  Tooltip,
  message,
  Typography,
} from "antd";
import { ArrowRightOutlined, ExportOutlined } from "@ant-design/icons";
import { api } from "~/server/trpc/clients/react";
import Link from "next/link"; // Importing Next.js Link component
import { useAgent } from "../AgentContext";
import { type ClientWebsite } from "../../documents/types";

const { Text } = Typography;

interface WebsiteData extends ClientWebsite {
  enabled: boolean;
}

const WebsitesCard = () => {
  const [websiteData, setWebsiteData] = useState<WebsiteData[]>([]);
  const [newWebsite, setNewWebsite] = useState("");
  const [loading, setLoading] = useState(true);
  const apiUtils = api.useUtils();
  const clientWebsitesQuery = api.knowledge.getClientWebsites.useQuery(void 0, {
    placeholderData: (prev) => prev,
    refetchInterval: 10000,
  });

  const { agentResponse, agent_id } = useAgent();

  const updateAgentKnowledgeMutation = api.agent.update.useMutation(); // Assuming you have an update mutation
  const ingestWebMutation = api.knowledge.ingestWebsite.useMutation(); // Mutation for ingesting website

  useEffect(() => {
    if (clientWebsitesQuery.data && agentResponse) {
      const enabledWebsites = agentResponse.knowledge.map((kn) => kn.uuid);
      const websites = clientWebsitesQuery.data.map((site) => ({
        url: site.url,
        status: site.status,
        enabled: enabledWebsites.includes(site.knowledge_uuid),
        knowledge_uuid: site.knowledge_uuid,
        updatedAt: site.updatedAt,
      }));
      setWebsiteData(websites);
      setLoading(false);
    }
  }, [clientWebsitesQuery.data, agentResponse]);

  const handleAddWebsite = async () => {
    if (newWebsite) {
      setLoading(true);
      try {
        await ingestWebMutation.mutateAsync(
          {
            url: newWebsite,
            crawl: true,
            assistant_uuid: agentResponse?.voice_assistant.uuid,
          },
          {
            onSuccess: (data) => {
              apiUtils.knowledge.getClientWebsites.setData(void 0, data);
            },
          },
        );

        await apiUtils.agent.get.invalidate({ agent_id: agent_id });
        setNewWebsite("");
        await message.success("Website added successfully");
      } catch (error) {
        await message.error("Failed to add website");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleWebsiteEnabled = (website: WebsiteData, enabled: boolean) => {
    setWebsiteData((prevData) =>
      prevData.map((f) => (f.url === website.url ? { ...f, enabled } : f)),
    );

    const updatedSelectedKnowledge = enabled
      ? [
          ...agentResponse!.knowledge.map((kn) => kn.uuid),
          website.knowledge_uuid,
        ]
      : agentResponse!.knowledge
          .map((kn) => kn.uuid)
          .filter((uuid) => uuid !== website.knowledge_uuid);

    updateAgentKnowledgeMutation.mutate({
      voice_assistant_uuid: agentResponse!.voice_assistant.uuid,
      selectedKnowledge: updatedSelectedKnowledge,
    });
  };

  return (
    <Card
      title={
        <div style={{ paddingTop: "12px", paddingBottom: "12px" }}>
          <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            Websites
          </Text>
          <p></p>
          <Text type="secondary" style={{ fontWeight: "normal" }}>
            Add and manage websites for {agentResponse?.voice_assistant.name} to
            reference in their responses.
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
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center" }}>
        <Input
          placeholder="Enter website URL"
          value={newWebsite}
          onChange={(e) => setNewWebsite(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <Button type="primary" onClick={handleAddWebsite} loading={loading}>
          Add Website
        </Button>
      </div>
      {loading ? (
        <Spin />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={websiteData}
          renderItem={(item, index) => (
            <List.Item
              key={index}
              actions={[
                <Tooltip
                  title={`Add ${item.url} to ${agentResponse?.voice_assistant.name}'s knowledge`}
                  key={0}
                >
                  <Switch
                    checked={item.enabled}
                    onChange={(checked) => toggleWebsiteEnabled(item, checked)}
                  />
                </Tooltip>,
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={1}
                >
                  <Button
                    type="link"
                    icon={
                      <ArrowRightOutlined style={{ color: "var(--primary)" }} />
                    }
                  />
                </a>,
              ]}
            >
              <List.Item.Meta title={item.url} />
              <div>
                {item.status === "ENQUEUE" ? <Spin /> : item.status}
                {item.status === "FAILED" && (
                  <Button
                    type="link"
                    style={{ marginLeft: 12, padding: 0 }}
                    onClick={() => {
                      ingestWebMutation.mutate({ url: item.url, crawl: true });
                      setWebsiteData((prevData) =>
                        prevData.map((f) =>
                          f.url === item.url ? { ...f, status: "ENQUEUE" } : f,
                        ),
                      );
                    }}
                  >
                    Retry Now
                  </Button>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default WebsitesCard;
