"use client";

import React from 'react';
import { Button, Card, Dropdown, Space, Typography, Menu } from 'antd';
import { useAgent } from '../AgentContext';
import AnalyticsCardGroup from './AnalyticsCardGroup';
import { DownOutlined, ExportOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Text } = Typography;

const AnalyticsCard: React.FC = () => {
    const { agentResponse } = useAgent();
    const [selectedTimeframe, setSelectedTimeframe] = React.useState('last_7_days');

    const items = [
        {
            label: 'Last 24 hours',
            key: 'last_24_hours'
        },
        {
            label: 'Last 3 days',
            key: 'last_3_days'
        },
        {
            label: 'Last 7 days',
            key: 'last_7_days'
        },
        {
            label: 'Last 30 days',
            key: 'last_30_days'
        }
    ];

    const handleMenuClick = (item: { key: string }) => {
        setSelectedTimeframe(item.key);
    };

    const menu = (
        <Menu onClick={handleMenuClick}>
            {items.map((item) => (
                <Menu.Item key={item.key}>
                    {item.label}
                </Menu.Item>
            ))}
        </Menu>
    );

    const getDateRange = (timeframe: string) => {
        const now = new Date();
        let startDate = new Date();
        switch (timeframe) {
            case 'last_24_hours':
                startDate.setDate(now.getDate() - 1);
                break;
            case 'last_3_days':
                startDate.setDate(now.getDate() - 3);
                break;
            case 'last_7_days':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'last_30_days':
                startDate.setDate(now.getDate() - 30);
                break;
            default:
                startDate = new Date();
        }
        return {
            startDate: startDate.toISOString().split('T')[0] + ' 00:00',
            endDate: now.toISOString().split('T')[0] + ' 00:00'
        };
    };

    const { startDate, endDate } = getDateRange(selectedTimeframe);
    const agentId = agentResponse?.voice_assistant.uuid;
    const url = `/analytics?receptionists=${agentId}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    return (
        <Card
            title={
                <div style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                    <Text style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        Insights <Link href={url} style={{ marginLeft: 8, color: `var(--primary)` }}><ExportOutlined /></Link>
                    </Text>
                    <p></p>
                    <Text type="secondary" style={{ fontWeight: 'normal' }}>
                        Understand how {agentResponse?.voice_assistant.name ?? 'your receptionist'} is performing
                    </Text>
                </div>
            }
            style={{ width: '100%' }}
            extra={
                <Dropdown overlay={menu} trigger={['click']}>
                    <Button>
                        <Space>
                            {items.find(item => item.key === selectedTimeframe)?.label}
                            <DownOutlined />
                        </Space>
                    </Button>
                </Dropdown>
            }
        >
            <AnalyticsCardGroup timeframe={selectedTimeframe} />
        </Card>
    );
};

export default AnalyticsCard;
