"use client";

import React, { useState } from "react";
import { Row, Col } from "antd";
import AgentHeader from "../_components/AgentHeader";
import SettingsForm from "../_components/SettingsForm";
import ConversationLog from "../_components/ConversationLog";
import DocumentsCard from "../_components/DocumentsCard";
import WebsitesCard from "../_components/WebsitesCard";
import AdditionalKnowledge from "../_components/AdditionalKnowledge";
import { AgentProvider } from "../AgentContext";
import AnalyticsCard from "../_components/AnalyticsCard";
import Link from "next/link";
import { Icons } from "~/components/Icons";

function AgentPage({ agent_id }: { agent_id: string }) {
  const [activeTab, setActiveTab] = useState<
    "settings" | "dataSources" | "convos"
  >("settings");

  const handleTabChange = (value: string | number) => {
    setActiveTab(value as "settings" | "dataSources" | "convos");
  };

  return (
    <AgentProvider agent_id={agent_id}>
      <div style={{ width: "100%", height: "100vh" }}>
        <Link className="mb-3 inline-flex" href={"/receptionists"}>
          <Icons.arrowLeft />
          <div className="mx-2">Go Back</div>
        </Link>
        <AgentHeader activeTab={activeTab} onTabChange={handleTabChange} />
        <div style={{ padding: "8px 0" }}></div>
        {/* Content Area */}
        {activeTab === "settings" && (
          <>
            <AnalyticsCard />
            <div style={{ padding: "8px 0" }}></div>
            <Row gutter={16} style={{ paddingBottom: "48px" }}>
              <Col span={24}>
                <SettingsForm />
              </Col>
            </Row>
          </>
        )}

        {activeTab === "dataSources" && (
          <>
            <DocumentsCard />
            <div style={{ padding: "8px 0" }}></div>
            <WebsitesCard />
            <div style={{ padding: "8px 0" }}></div>
            <AdditionalKnowledge />
            <div style={{ padding: "50px 0" }}></div>
          </>
        )}

        {activeTab === "convos" && <ConversationLog />}
      </div>
    </AgentProvider>
  );
}

export default AgentPage;
