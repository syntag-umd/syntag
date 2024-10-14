"use client";

import React from "react";
import { Card, Row, Col, Typography, Spin } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import { RangePickerProps } from "./types";
import { api } from "~/server/trpc/clients/react";

const { Text } = Typography;

const CallCountCard: React.FC<{
  agent_ids: string[];
  selected_dates: RangePickerProps["value"];
}> = ({ agent_ids, selected_dates }) => {
  // Memoize the dates to prevent unnecessary re-renders
  const startDate = React.useMemo(
    () =>
      selected_dates?.[0]?.toDate() ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    [selected_dates],
  );
  const endDate = React.useMemo(
    () => selected_dates?.[1]?.toDate() ?? new Date(Date.now()),
    [selected_dates],
  );

  const { data: callCount, isLoading } =
    api.conversations.getConversationCount.useQuery({
      agent_ids,
      startDate,
      endDate,
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
