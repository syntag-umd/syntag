import React from "react";
import { Card, Row, Col, Typography, Spin } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { api } from "~/server/trpc/clients/react";
import { RangePickerProps } from "./types";

const { Text } = Typography;

const TimeSavedCard: React.FC<{
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

  const { data: conversationSum, isLoading } =
    api.conversations.getConversationDurationSum.useQuery({
      agent_ids,
      startDate,
      endDate,
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

  return (
    <Card style={{ borderRadius: "16px" }}>
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
          Based on the duration of your receptionists&apos; conversations
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
