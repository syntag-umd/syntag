"use client";

import React from 'react';
import { Row, Col, Segmented, Skeleton, Typography } from 'antd';
import Image from 'next/image';
import { CallButtonWrapped } from './CallButton';
import { useAgent } from '../AgentContext';
import { voicesRecord } from '~/features/agents/types';

const { Text } = Typography;

interface AgentHeaderProps {
    activeTab: 'settings' | 'dataSources' | 'convos';
    onTabChange: (value: string | number) => void;
}

const AgentHeader: React.FC<AgentHeaderProps> = ({ activeTab, onTabChange }) => {
    const { agentResponse, isAgentError, agentError } = useAgent();

    if (isAgentError) {
        return (
            <div className="flex w-full flex-col items-center">
                <h3>Failed to get agent: {agentError?.message}</h3>
            </div>
        );
    }

    if (!agentResponse) {
        return <AgentHeaderSkeleton />;
    }

    return (
        <div>
            <Row align="bottom" justify="space-between">
                <Col>
                    <Row align="bottom" className="m-1">
                        <Image
                            src={voicesRecord[agentResponse.voice_config.voice].picSrc}
                            alt={voicesRecord[agentResponse.voice_config.voice].name}
                            className="w-16 sm:w-20"
                            style={{ borderRadius: '8px', marginRight: '8px' }}
                        />
                        <div>
                            <Text strong style={{ fontSize: '2rem', whiteSpace: 'normal', overflowWrap: 'break-word', lineHeight: '1' }}>
                                {agentResponse.voice_assistant.name}
                            </Text>
                            <Text className="text-wrap" type="secondary"  style={{ fontSize: '1rem', display: 'block', lineHeight: '1' }}>
                                Last updated: yesterday
                            </Text>
                        </div>
                    </Row>
                </Col>
                <Col className="order-last m-auto sm:m-0 pt-3">
                    <Segmented
                        defaultValue={activeTab}
                        options={[
                            { label: 'Settings', value: 'settings' },
                            { label: 'Data Sources', value: 'dataSources' },
                            { label: 'Conversations', value: 'convos' },
                        ]}
                        onChange={onTabChange}
                        size="large"
                        style={{ borderRadius: '10px', padding: '8px 16px', display: 'inline-block' }}
                    />
                </Col>
                <Col className="md:order-last">
                    <CallButtonWrapped
                        vapi_assistant_id={agentResponse.voice_config.vapiAssistantId}
                        name={agentResponse.voice_assistant.name ?? ''}
                    />
                </Col>
            </Row>
        </div>
    );
};

const AgentHeaderSkeleton = () => (
    <div style={{ borderRadius: '18px', width: '100%' }}>
    <Row style={{ width: '100%' }} align="middle" justify="space-between">
        {/* Left-aligned skeleton for profile picture and agent name */}
        <Col style={{ display: 'flex', alignItems: 'center', width: '33%' }}>
            <Skeleton.Avatar active size={75} style={{ marginRight: '8px' }} />
            <div>
                <Skeleton.Input
                    active
                    style={{ width: 200, height: '2.5rem', marginBottom: '4px' }}
                    size="large"
                />
                <Skeleton.Input
                    active
                    style={{ width: 150, height: '1rem' }}
                    size="small"
                />
            </div>
        </Col>

        {/* Center-aligned skeleton for Segmented Menu */}
        <Col style={{ textAlign: 'center', width: '33%' }}>
            <Skeleton.Button
                active
                style={{ width: 200, height: '40px', borderRadius: '18px' }}
            />
        </Col>

        {/* Right-aligned skeleton for Call Button */}
        <Col style={{ textAlign: 'right', width: '33%' }}>
            <Skeleton.Button
                active
                style={{ width: 100, height: '40px' }}
                size="large"
            />
        </Col>
    </Row>
    </div>
);

export default AgentHeader;
