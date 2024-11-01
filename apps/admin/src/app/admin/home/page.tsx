"use client"; // Add this directive at the top of the file
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton, useUser, SignOutButton } from '@clerk/nextjs';
import React, { useEffect, useState } from 'react';
import { Layout, Tabs, Typography, Statistic, Row, Col, Menu } from 'antd';
import { UserOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Title } = Typography;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalAccounts: 0,
    adminAccounts: 0,
    regularAccounts: 0,
    squireAccounts: 0,
    totalAssistants: 0,
    totalSignInsToday: 0,
    totalSignIns3Days: 0,
    totalSignInsWeek: 0,
    totalSignInsMonth: 0,
    totalUsers: 0, // New metric for Clerk users
  });

  const { user, isLoaded } = useUser(); // Use the useUser hook to get user data



  useEffect(() => {
    const fetchMetrics = async () => {
      // Fetch all users
      const { data: users, error: userError } = await supabase
        .from('user') // Specify the table name
        .select('id'); // Fetch only the 'id' or any other field if needed

      if (userError) {
        console.error("Error fetching users:", userError);
        return;
      }

      // Fetch admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('user')
        .select('id')
        .eq('is_admin_account', true); // Query to fetch only admin accounts

      if (adminError) {
        console.error("Error fetching admin accounts:", adminError);
        return;
      }

      // Fetch voice assistants and calculate squire accounts
      const { data: voiceBots, error: voiceBotsError } = await supabase
        .from('voice_assistant')
        .select('uuid, agent_config'); // Fetch UUIDs and agent_config

      if (voiceBotsError) {
        console.error("Error fetching voice assistants:", voiceBotsError);
        return;
      }

      // Calculate unique squire accounts
      const squireUUIDs = new Set<string>(); // Use a Set to store unique UUIDs
      voiceBots.forEach(bot => {
        const config = bot.agent_config; // Access agent_config
        if (config?.type === "squire") { // Check if type is "squire"
          squireUUIDs.add(bot.uuid); // Add UUID to the Set
        }
      });

      const totalSquireAccounts = squireUUIDs.size; // Get the count of unique squire UUIDs

      // Fetch Clerk user data
      const fetchUserData = async () => {
        try {
          const response = await fetch('../api/getUsers');
          const data = await response.json();
          if (response.ok) {
            setMetrics(prevMetrics => ({
              ...prevMetrics,
              totalUsers: data.totalUsers, // Update total Clerk users count
              totalSignInsToday: data.totalSignedInToday,
              totalSignIns3Days: data.totalSignIns3Days,
              totalSignInsWeek: data.totalSignInsWeek,
              totalSignInsMonth: data.totalSignInsMonth,
            }));
          } else {
            console.error("Error fetching Clerk user data:", data.error);
          }
        } catch (error) {
          console.error("Error fetching Clerk user data:", error);
        }
      };

      // Call Clerk user data fetch
      fetchUserData();

      // Calculate metrics
      const totalAssistants = voiceBots.length;
      const totalAccounts = users.length;
      const adminAccounts = adminUsers.length;

      // Update your state with the new metrics
      setMetrics(prevMetrics => ({
        ...prevMetrics,
        totalAssistants: totalAssistants,
        totalAccounts: totalAccounts,
        adminAccounts: adminAccounts,
        squireAccounts: totalSquireAccounts, // Update squire accounts
      }));
    };

    fetchMetrics();
  }, []);


  return (
    <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Admin Dashboard</Title>
          <SignOutButton redirectUrl = "/sign-in"/>
        </Header>

        <Content style={{ margin: '24px 16px 0' }}>
          {isLoaded && user && ( // Check if user data is loaded and available
            <Title level={4}>
              Welcome, {user.firstName} {user.lastName}!
            </Title>
          )}
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Total Clerk Users" value={metrics.totalUsers} /> {/* New Clerk users metric */}
                </Col>
                <Col span={8}>
                  <Statistic title="Total Accounts" value={metrics.totalAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Admin Accounts" value={metrics.adminAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Squire Accounts" value={metrics.squireAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Assistants" value={metrics.totalAssistants} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Sign-ins Today" value={metrics.totalSignInsToday} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Sign-ins Past 3 Days" value={metrics.totalSignIns3Days} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Sign-ins Past Week" value={metrics.totalSignInsWeek} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Sign-ins Past Month" value={metrics.totalSignInsMonth} />
                </Col>
              </Row>

        </Content>
    </Layout>
  );
};

export default AdminDashboard;
