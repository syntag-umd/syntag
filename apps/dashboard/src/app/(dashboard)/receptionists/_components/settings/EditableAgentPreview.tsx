import {
  Card,
  Typography,
  Input,
  Collapse,
  Flex,
  Select,
  Button,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  type EmotionTags,
  type EmotionValue,
  type PreconfiguredAgentProps,
  FormalityLevel,
  HumorLevel,
  ToneOfVoice,
} from "~/features/agents/types";
import { type ClientFile } from "../../../documents/types";
import { EditOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

const CustomRadioGroup = ({
  onChange,
  defaultValue,
  enum_,
  label,
}: {
  onChange: (e: EmotionTags[keyof EmotionTags]) => void;
  defaultValue: string | number;
  enum_: EmotionValue;
  label: string;
}) => {
  const spanLength = 24 / Object.values(enum_).length;

  return (
    <div className="my-1">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <Row gutter={3}>
        {Object.values(enum_).map((val: keyof typeof enum_, index) => (
          <Col key={index} span={spanLength}>
            {defaultValue === val ? (
              <Button
                key={index + label}
                type="primary"
                className="w-full font-bold text-white"
              >
                {val}
              </Button>
            ) : (
              <Button
                key={index + label}
                style={{ width: "100%" }}
                onClick={(_) => onChange(enum_[val])}
              >
                {val}
              </Button>
            )}
          </Col>
        ))}
      </Row>
    </div>
  );
};

const EditableAgentPreview = ({
  agent,
  availableFiles,
  onStateChange,
}: {
  agent: PreconfiguredAgentProps["agent"];
  availableFiles: ClientFile[];
  onStateChange: (
    field: keyof PreconfiguredAgentProps["agent"],
    value: any,
  ) => void;
}) => {
  const handleTagChange = (
    field: keyof EmotionTags,
    value: EmotionTags[keyof EmotionTags],
  ) => {
    if (agent.emotionTags) {
      const newEmotionTags = { ...agent.emotionTags, [field]: value };
      onStateChange("emotionTags", newEmotionTags);
    }
  };

  const handleAreaCodeChangeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value !== agent.areaCode) {
      onStateChange("areaCode", value);
    }
  };

  return (
    <Card className="flex w-[450px] flex-col justify-center text-left">
      <div>
        <Title
          editable={{
            onChange: (value) => {
              onStateChange("name", value),
                onStateChange(
                  "firstMessage",
                  "Hello, I'm " + value + ". How can I help you today?",
                );
            },
            icon: (
              <EditOutlined
                className="relative bottom-[-3px] left-[3px]"
                style={{ color: "#E06666" }}
              />
            ),
          }}
          style={{ marginTop: 15, marginBottom: 10 }}
          level={3}
        >
          {agent.name}
        </Title>
      </div>
      <div>
        {/*         <div className="mb-1 text-muted-foreground">
          Attach New Phone Number
        </div>
        <Input
          value={agent.areaCode}
          placeholder="650"
          addonBefore="("
          addonAfter=") XXX-XXXX"
          onChange={handleAreaCodeChangeChange}
          onBlur={(e) => onStateChange("areaCode", e.target.value)}
          count={{
            show: false,
            max: 3,
            strategy: (txt) => txt.length,
            exceedFormatter: (txt, { max }) => txt.slice(0, max),
          }}
          className="mb-1 w-full max-w-64 p-0"
        /> */}
      </div>
      <div>
        {agent.areaCode &&
        agent.areaCode.length > 0 &&
        agent.areaCode.length != 3 ? (
          <Text>Area code must be 3 digits</Text>
        ) : null}
      </div>
      <Flex vertical style={{ margin: "20px 0" }}>
        <CustomRadioGroup
          onChange={(value) => handleTagChange("formalityLevel", value)}
          defaultValue={agent.emotionTags?.formalityLevel}
          enum_={FormalityLevel}
          label="Formality Level"
        />
        <CustomRadioGroup
          onChange={(value) => handleTagChange("toneOfVoice", value)}
          defaultValue={agent.emotionTags?.toneOfVoice}
          enum_={ToneOfVoice}
          label="Tone of Voice"
        />

        <CustomRadioGroup
          onChange={(value) => handleTagChange("humorLevel", value)}
          defaultValue={agent.emotionTags?.humorLevel}
          enum_={HumorLevel}
          label="Humor Level"
        />
      </Flex>
      <Tooltip
        trigger={["focus"]}
        title={
          agent.name +
          " will scan " +
          (agent.websiteRef == "" ? "your website" : agent.websiteRef) +
          " and learn about your company!"
        }
        placement="topLeft"
        overlayClassName="numeric-input"
      >
        <Input
          value={agent.websiteRef}
          placeholder="www.syntag.ai"
          addonBefore="https://"
          onChange={(e) => onStateChange("websiteRef", e.target.value)}
          style={{ marginBottom: 8 }}
        />
      </Tooltip>
      <Collapse
        size="small"
        style={{ textAlign: "left" }}
        items={[
          {
            key: "1",
            label:
              (agent.selectedKnowledge.length == 0
                ? "No"
                : agent.selectedKnowledge.length) +
              " FAQ document" +
              (agent.selectedKnowledge.length == 1 ? "" : "s"),
            children: (
              <Select
                mode="multiple"
                allowClear
                style={{ width: "100%" }}
                placeholder="Please select"
                onChange={(value) => onStateChange("selectedKnowledge", value)}
                options={availableFiles.map((file) => ({
                  label: file.displayName,
                  value: file.knowledge_uuid,
                }))}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default EditableAgentPreview;
