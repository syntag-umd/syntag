import React from "react";
import { Card, Row, Col, Typography } from "antd";
import styled from "@emotion/styled";
import Convos from "../[agent_id]/Convos";
import { useAgent } from "../AgentContext";

const { Text } = Typography;

const StyledCard = styled(Card)`
  border-radius: 12px;
  width: 100%;
`;

const ConversationLog: React.FC = () => {
  const { agentResponse } = useAgent();

  const agentName = agentResponse?.voice_assistant.name;

  return (
    <StyledCard
      title={
        <div style={{ paddingTop: "12px", paddingBottom: "12px" }}>
          <Text style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            Conversations
          </Text>
          <p></p>
          <Text type="secondary" style={{ fontWeight: "normal" }}>
            Understand how {agentName} resolves your customers&apos; issues
          </Text>
        </div>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
        <Col span={24}>
          <Convos agent_id={agentResponse!.voice_assistant.uuid} />
        </Col>
      </Row>
    </StyledCard>
  );
};

export default ConversationLog;
