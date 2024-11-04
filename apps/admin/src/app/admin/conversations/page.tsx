"use client"; // Ensure this is the first line in your file

import '../../globals.css';
import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button } from 'antd';
import Link from 'next/link'; // Import Link from Next.js

const { Header, Content } = Layout;
const { Title } = Typography;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

type User = {
  uuid: string;
  name: string;
  email: string; // Add email to the User type
};

type Conversation = {
  userUuid: string;
};

const ConversationsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10; // Number of users to display per page

  useEffect(() => {
    const fetchConversations = async () => {
      // Step 1: Fetch all conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversation')
        .select('userUuid');

      if (convError) {
        console.error("Error fetching conversations:", convError);
        setLoading(false);
        return;
      }

      // Step 2: Get unique user UUIDs from the conversations
      const uniqueUserUuids = Array.from(new Set(conversations?.map(conv => conv.userUuid)));

      // Step 3: Fetch user names and emails based on the unique UUIDs
      const { data: usersData, error: userError } = await supabase
        .from('user')
        .select('uuid, name, email') // Include email here
        .in('uuid', uniqueUserUuids);

      if (userError) {
        console.error("Error fetching users:", userError);
        setLoading(false);
        return;
      }

      setUsers(usersData || []);
      setLoading(false);
    };

    fetchConversations();
  }, []);

  // Pagination calculations
  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Conversations</Title>
      </Header>

      <Content style={{ margin: '24px 16px 0' }}>
        {loading ? (
          <p>Loading conversations...</p>
        ) : (
          <div>
            {currentUsers.length > 0 ? (
              currentUsers.map(user => (
                <Link key={user.uuid} href={`/admin/conversations/${user.uuid}`} passHref>
                  <Button
                    style={{
                      margin: '10px',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      width: '320px', // Adjust width as needed
                      height: '100px',
                      padding: '15px 20px',
                      backgroundColor: '#f5f7fa', // Light background for admin feel
                      border: '1px solid #e0e0e0', // Subtle border
                      borderRadius: '8px', // Rounded corners
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Soft shadow for depth
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease', // Smooth hover effect
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '16px', color: '#333' }}>{user.name || 'Unknown User'}</strong>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Email: {user.email}</div>
                    </div>
                  </Button>
                </Link>
              ))
            ) : (
              <p>No users found</p>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <Button onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
        </div>
      </Content>
    </Layout>
  );
};

export default ConversationsPage;
