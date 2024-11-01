"use client"; // Ensure this is the first line in your file

import '../../../globals.css';
import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { Layout, Typography, Spin } from 'antd';
import { useParams } from 'next/navigation'; // Use useParams from next/navigation

const { Header, Content } = Layout;
const { Title } = Typography;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

type Conversation = {
  id: string; // Assuming there's an ID for the conversation
  userUuid: string;
  createdAt: string; // Assuming this is in ISO 8601 format
  summary: string;
};

const UserConversationsPage: React.FC = () => {
  const { uuid } = useParams(); // Get the UUID from the URL
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!uuid) return; // Ensure uuid is available before making the request

      // Fetch conversations for the specific user based on their UUID
      const { data, error } = await supabase
        .from('conversation')
        .select('id, userUuid, createdAt, summary') // Include createdAt instead of date
        .eq('userUuid', uuid); // Get conversations for the specific user

      if (error) {
        console.error("Error fetching conversations:", error);
      } else {
        setConversations(data || []);
      }
      setLoading(false); // Update loading state
    };

    fetchConversations();
  }, [uuid]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '15px' }}>
        <Title level={3} style={{ margin: 0 }}>User Conversations</Title>
      </Header>

      <Content style={{ margin: '24px 16px 0' }}>
        {loading ? (
          <Spin size="large" />
        ) : (
          <div>
            {conversations.map((conversation) => (
              <div key={conversation.id} style={{ marginBottom: '16px' }}>
                <div>
                  <strong>Date:</strong> {new Date(conversation.createdAt).toLocaleString()} {/* Format date for display */}
                </div>
                <div>
                  <strong>Summary:</strong> {conversation.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default UserConversationsPage;
