"use client";

import React from "react";
import { Card, Row, Col, Typography, Spin, Skeleton } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useAgent } from "../AgentContext";
import { api } from "~/server/trpc/clients/react";

const { Text } = Typography;

const TimeSavedCard: React.FC<{ timeframe: string }> = ({ timeframe }) => {
  const { agentResponse, agent_id } = useAgent();

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

  const { data: conversationSum, isLoading } =
    api.conversations.getConversationDurationSum.useQuery({
      agent_id,
      days_since,
    });

  const formatTime = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = seconds / 3600;
      return `${hours.toFixed(1)} hours`;
    } else if (seconds >= 60) {
      const minutes = seconds / 60;
      return `${minutes.toFixed(1)} minutes`;
    } else {
      return `< 1 minute`;
    }
  };

  if (!agentResponse) {
    return (
      <Card
        style={{
          borderRadius: "16px",
        }}
      >
        <Row>
          <Col>
            <ClockCircleOutlined style={{ fontSize: "24px" }} />
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
            Time Saved
          </Text>
          <Text
            type="secondary"
            style={{ fontSize: "14px", textAlign: "left", width: "100%" }}
          >
            Based on your conversation duration
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

  return (
    <Card
      style={{
        borderRadius: "16px",
      }}
    >
      <Row>
        <Col>
          <ClockCircleOutlined style={{ fontSize: "24px" }} />
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
          Time Saved
        </Text>
        <Text
          type="secondary"
          style={{ fontSize: "14px", textAlign: "left", width: "100%" }}
        >
          Based on your conversation duration
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
              {conversationSum !== null
                ? formatTime(conversationSum ?? 0)
                : "No data"}
            </Text>
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default TimeSavedCard;
