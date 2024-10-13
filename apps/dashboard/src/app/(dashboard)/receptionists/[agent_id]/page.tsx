"use client";

import React from 'react';
import AgentPage from './AgentPage';

export default function page(props: { params: { agent_id: string } }) {
    const { agent_id } = props.params;
    return <AgentPage agent_id={agent_id} />;
}
