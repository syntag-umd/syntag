"use client";

import React from "react";
import { Card, Row, Col, Typography } from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import { RangePickerProps } from "./types";
import CallCountCharts from "./CallCountCharts";

const { Text } = Typography;

const CallCountChartsCard: React.FC<{
  agent_ids: string[];
  selected_dates: RangePickerProps["value"];
  receptionistMap: Record<string, string>;
}> = ({ agent_ids, selected_dates, receptionistMap }) => {
  console.log(agent_ids, selected_dates, receptionistMap);
  return (
    <Card
      style={{
        borderRadius: "16px",
      }}
      title={
        <Row align="middle">
          <Col>
            <LineChartOutlined style={{ fontSize: "24px" }} />
          </Col>
          <Col>
            <Text
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                marginLeft: "8px",
              }}
            >
              Call history
            </Text>
            <Text
              style={{
                fontSize: "14px",
                fontWeight: "normal",
                marginLeft: "8px",
                opacity: "60%",
              }}
            >
              See the number of calls answered by each receptionist every day
            </Text>
          </Col>
        </Row>
      }
    >
      <Row>
        <Col span={24}>
          <CallCountCharts
            agent_ids={agent_ids}
            selected_dates={selected_dates}
            receptionistMap={receptionistMap}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default CallCountChartsCard;
