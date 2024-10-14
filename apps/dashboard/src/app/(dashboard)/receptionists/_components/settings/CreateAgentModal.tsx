"use client";

import EditableAgentPreview from "./EditableAgentPreview";
import CreateAgentSelectConfig from "./CreateAgentSelectConfig";
import { Row, Modal, Button } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreateAgentSchema,
  FormalityLevel,
  HumorLevel,
  ToneOfVoice,
  type PreconfiguredAgentProps,
} from "~/features/agents/types";
import { api } from "~/server/trpc/clients/react";

const agentSteve: PreconfiguredAgentProps = {
  agent: {
    firstMessage: "Hello, I'm Steve. How can I help you today?",
    voice: "american_male",
    instructions:
      "Help customers with their questions and concerns. Make sure to tell anyone calling that in order to edit this receptionist, they need to click on this receptionist in the Receptionists Tab, click Edit Configuration and change the instructions.",
    knowledge: "",
    name: "Steve",
    selectedKnowledge: [],
    emotionTags: {
      formalityLevel: FormalityLevel.Professional,
      toneOfVoice: ToneOfVoice.Informative,
      humorLevel: HumorLevel.None,
    },
    areaCode: "650",
    websiteRef: "poshmark.com",
  },
  cardProps: {
    name: "Steve",
    emotionDescription: "Professional, Informative",
    purposeDescription: "Poshmark Customer Support",
  },
};

const agentClara: PreconfiguredAgentProps = {
  agent: {
    firstMessage: "Hi, I'm Clara. How can I help you today?",
    voice: "american_female",
    instructions:
      "Help customers with their questions and concerns. Make sure to tell anyone calling that in order to edit this agent, they need to click on this agent in the Assistants Tab, click Edit Configuration and change the instructions.",
    knowledge: "",
    name: "Clara",
    selectedKnowledge: [],
    emotionTags: {
      formalityLevel: FormalityLevel.Casual,
      toneOfVoice: ToneOfVoice.None,
      humorLevel: HumorLevel.Lighthearted,
    },
    areaCode: "650",
    websiteRef: "siliconvalleytennis.com",
  },
  cardProps: {
    name: "Clara",
    emotionDescription: "Casual, Funny",
    purposeDescription: "Tennis Club CX Agent",
  },
};

const CreateAgentModal = () => {
  const utils = api.useUtils();
  const clientFilesQuery = api.knowledge.getClientDocuments.useQuery(void 0, {
    placeholderData: (prev) => prev,
  });

  const [agent, setAgent] = useState<PreconfiguredAgentProps["agent"]>(
    agentSteve.agent,
  );
  const [open, setOpen] = useState<boolean>(false);
  const [loadingCreate, setLoadingCreate] = useState<boolean>(false);

  const router = useRouter();
  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  const agentMutation = api.agent.create.useMutation();
  const agents = [agentSteve, agentClara];

  const onFinish = async () => {
    const createAgent: CreateAgentSchema = {
      name: agent.name,
      firstMessage: agent.firstMessage,
      knowledge: agent.knowledge ?? "",
      instructions: agent.instructions,
      voice: agent.voice,
      selectedKnowledge: agent.selectedKnowledge,
      emotionTags: agent.emotionTags,
      websiteRef: agent.websiteRef,
      areaCode: agent.areaCode,
    };

    setLoadingCreate(true);

    const newAssistant = await agentMutation.mutateAsync(createAgent);
    await utils.agent.getOverview.invalidate(void 0, {
      type: "all",
      refetchType: "all",
    });
    utils.agent.get.setData(
      { agent_id: newAssistant.voice_assistant.uuid },
      newAssistant,
    );
    closeModal();
    setLoadingCreate(false);

    setTimeout(() => {
      router.push(`/receptionists/${newAssistant.voice_assistant.uuid}`);
    }, 250);
  };

  return (
    <>
      <Button type="primary" size="large" onClick={openModal}>
        Create Receptionist
      </Button>
      <Modal
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "row",
          minWidth: 1000,
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
        okText="Submit"
        onOk={onFinish}
        onCancel={closeModal}
        closable={false}
        open={open}
        okButtonProps={{ loading: loadingCreate }}
      >
        <Row gutter={10} style={{ backgroundColor: "transparent" }}>
          <CreateAgentSelectConfig
            agents={agents}
            currentAgent={agent}
            setAgent={setAgent}
            submitLoading={loadingCreate}
          />
          <EditableAgentPreview
            agent={agent}
            availableFiles={clientFilesQuery.data ?? []}
            onStateChange={(
              field: keyof PreconfiguredAgentProps["agent"],
              value: any,
            ) => {
              setAgent((prevState) => {
                const newState = { ...prevState, [field]: value };
                return newState;
              });
            }}
          />
        </Row>
      </Modal>
    </>
  );
};

export default CreateAgentModal;
