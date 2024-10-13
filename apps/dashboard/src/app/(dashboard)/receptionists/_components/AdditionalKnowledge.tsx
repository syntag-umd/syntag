"use client";

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Tooltip, Typography } from 'antd';
import { api } from '~/server/trpc/clients/react';
import { useAgent } from '../AgentContext';

const { Text } = Typography;

const { TextArea } = Input;

const AdditionalKnowledgeCard = () => {
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const { agentResponse } = useAgent();

  useEffect(() => {
      if (agentResponse) {
        setAdditionalInfo(agentResponse.model.instructions);
      }
  }, [agentResponse]);

  const updateAgentKnowledgeMutation = api.agent.update.useMutation(); // Assuming you have an update mutation

  const handleSaveInfo = async () => {
    setLoading(true);
    try {
      await updateAgentKnowledgeMutation.mutateAsync({
        voice_assistant_uuid: agentResponse!.voice_assistant.uuid,
        instructions: additionalInfo,
      });
    } catch (error) {
      console.error('Failed to save additional information:', error);
    } finally {
      setLoading(false);
    }
}

  return (
    <Card
      style={{ width: '100%' }}
      title={
        <div style={{ paddingTop: '12px', paddingBottom: '12px' }}>
          <Text style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Additional Knowledge
          </Text>
          <p></p>
          <Text type="secondary" style={{ fontWeight: 'normal' }}>
            Provide any additional information that might help {agentResponse?.voice_assistant.name} assist users.
          </Text>
        </div>
      }
    >
    <div style={{ marginBottom: 16 }}>
        <TextArea
            rows={4}
            placeholder={`Enter any additional information that ${agentResponse?.voice_assistant.name} should know`}
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
        />
    </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title={`Save this information to ${agentResponse?.voice_assistant.name}'s knowledge base`}>
          <Button 
            type="primary" 
            onClick={handleSaveInfo} 
            loading={loading}
          >
            Save Information
          </Button>
        </Tooltip>
      </div>
    </Card>
  );
};

export default AdditionalKnowledgeCard;
