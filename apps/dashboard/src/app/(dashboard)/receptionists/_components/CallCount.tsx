"use client";

import React from "react";
import { Card, Row, Col, Typography, Spin } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import { useAgent } from "../AgentContext";
import { api } from "~/server/trpc/clients/react";

const { Text } = Typography;

const CallCountCard: React.FC<{ timeframe: string }> = ({ timeframe }) => {
  const { agentResponse, agent_id } = useAgent();

  if (!agentResponse) {
    return (
      <Card
        style={{
          borderRadius: "16px",
        }}
      >
        <Row>
          <Col>
            <PhoneOutlined style={{ fontSize: "24px" }} />
          </Col>
        </Row>
        <Row style={{ marginTop: "16px" }}>
          <Text
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              textAlign: "left",
              width: "100%",
            }}
          >
            Call Count
          </Text>
          <Text
            type="secondary"
            style={{ fontSize: "14px", textAlign: "left", width: "100%" }}
          >
            Total number of calls
          </Text>
        </Row>
        <Row
          justify="center"
          style={{
            marginTop: "8px",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "8px",
          }}
        />
        <Row style={{ marginTop: "8px" }}>
          <Col span={12}>
            <Spin />
          </Col>
        </Row>
      </Card>
    );
  }

  const days_since =
    timeframe === "last_24_hours"
      ? 1
      : timeframe === "last_3_days"
        ? 3
        : timeframe === "last_7_days"
          ? 7
          : timeframe === "last_30_days"
            ? 30
            : 0;

  const { data: callCount, isLoading } =
    api.conversations.getConversationCount.useQuery({
      agent_ids: [agent_id],
      days_since,
    });

  return (
    <Card
      style={{
        borderRadius: "16px",
      }}
    >
      <Row>
        <Col>
          <PhoneOutlined style={{ fontSize: "24px" }} />
        </Col>
      </Row>
      <Row style={{ marginTop: "16px" }}>
        <Text
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            textAlign: "left",
            width: "100%",
          }}
        >
          Call Count
        </Text>
        <Text
          type="secondary"
          style={{ fontSize: "14px", textAlign: "left", width: "100%" }}
        >
          Total number of calls
        </Text>
      </Row>
      <Row
        justify="center"
        style={{
          marginTop: "8px",
          borderBottom: "1px solid #e8e8e8",
          paddingBottom: "8px",
        }}
      />
      <Row style={{ marginTop: "8px" }}>
        <Col span={12}>
          {isLoading ? (
            <Spin />
          ) : (
            <Text
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              {callCount !== undefined ? `${callCount} calls` : "No data"}
            </Text>
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default CallCountCard;
