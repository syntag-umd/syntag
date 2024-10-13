import { Card, Col, Row, Typography } from "antd";
import { type PreconfiguredAgentProps } from "~/features/agents/types";

const { Text, Title } = Typography;
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
function areAgentsEqual(
  agent1: PreconfiguredAgentProps["agent"],
  agent2: PreconfiguredAgentProps["agent"],
) {
  const keys = [
    ...new Set(Object.keys(agent1).concat(Object.keys(agent2))),
  ] as Array<keyof PreconfiguredAgentProps["agent"]>;
  for (const key of keys) {
    // I would say we want this, but it does say steve - Poshmark Customer support
    /* if (key === "websiteRef" || key === "selectedFiles") {
      continue;
    } */
    const v1 = getValue(agent1, key);
    const v2 = getValue(agent2, key);
    if (v1 !== v2) {
      return false;
    }
  }
  return true;
}

const CreateAgentSelectConfig = ({
  agents,
  currentAgent,
  setAgent,
  submitLoading,
}: {
  agents: PreconfiguredAgentProps[];
  currentAgent: PreconfiguredAgentProps["agent"];
  setAgent: (agent: PreconfiguredAgentProps["agent"]) => void;
  submitLoading: boolean;
}) => {
  return (
    <Card
      style={{
        width: 400,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        marginRight: 20,
        borderColor: "transparent",
      }}
    >
      <div>
        <Title style={{ marginBottom: 2, paddingBottom: 0 }} level={3}>
          Create your AI Receptionist
        </Title>
      </div>
      <div>
        <Text type="secondary">
          Select and customize a tried-and-tested receptionist.{" "}
        </Text>
      </div>
      {agents.map((agent) => {
        const areEqual = areAgentsEqual(agent.agent, currentAgent);
        return (
          <div
            className="cursor-default hover:cursor-pointer"
            key={agent.cardProps.name}
          >
            <Card
              className={`${areEqual ? "border-2 !border-primary !bg-card-hover" : "bg-transparent"}`}
              style={{
                marginTop: 20,
              }}
              onClick={() => setAgent(agent.agent)}
            >
              <Row>
                <Col>
                  <Title style={{ margin: "5px 0" }} level={4}>
                    {agent.cardProps.name}
                  </Title>
                  <Text type="secondary">
                    {agent.cardProps.emotionDescription}
                  </Text>
                  <div>
                    <Text style={{ color: "#E06666" }}>
                      {agent.cardProps.purposeDescription}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        );
      })}
    </Card>
  );
};

export default CreateAgentSelectConfig;
