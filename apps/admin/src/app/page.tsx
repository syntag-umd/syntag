"use client"; // Add this directive at the top of the file
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react';
import { Layout, Tabs, Typography, Statistic, Row, Col, Menu } from 'antd';
import { UserOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Title } = Typography;

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalAccounts: 0,
    adminAccounts: 0,
    regularAccounts: 0,
    squireAccounts: 0,
    totalAssistants: 0,
    squireAssistants: 0,
    regularAssistants: 0,
    totalDuration: 0,
    averageDuration: 0,
  });

  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState('1'); // State for the selected tab

  // useEffect(() => {
  //   // Fetch metrics from your API
  //   const fetchMetrics = async () => {
  //     const response = await fetch('/api/metrics'); // Adjust the API endpoint
  //     const metricsData = await response.json();
  //     setMetrics(metricsData);
  //   };

  //   // Simulate fetching user data
  //   const fetchUser = async () => {
  //     // Dummy user data for now
  //     const dummyUser = {
  //       firstName: "John",
  //       lastName: "Doe",
  //     };
  //     setUser(dummyUser);
  //   };

  //   fetchMetrics();
  //   fetchUser();
  // }, []);

  const handleMenuClick = (key: string) => {
    setSelectedTab(key); // Update selected tab state
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250}>
        <div className="logo" />
        <Menu theme="dark" mode="inline" selectedKeys={[selectedTab]} onClick={({ key }) => handleMenuClick(key)}>
          <Menu.Item key="1" icon={<UserOutlined />}>
            Home
          </Menu.Item>
          <Menu.Item key="2" icon={<RobotOutlined />}>
            Customers
          </Menu.Item>
          <Menu.Item key="3" icon={<MessageOutlined />}>
            Conversations
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Admin Dashboard</Title>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </Header>

        <Content style={{ margin: '24px 16px 0' }}>
          {user && (
            <Title level={4}>
              Welcome, {user.firstName} {user.lastName}!
            </Title>
          )}
          <Tabs activeKey={selectedTab} onChange={setSelectedTab}>
            <TabPane tab="Home" key="1">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Total Accounts" value={metrics.totalAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Admin Accounts" value={metrics.adminAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Regular Accounts" value={metrics.regularAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Squire Accounts" value={metrics.squireAccounts} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Assistants" value={metrics.totalAssistants} />
                </Col>
                <Col span={8}>
                  <Statistic title="Squire Assistants" value={metrics.squireAssistants} />
                </Col>
                <Col span={8}>
                  <Statistic title="Regular Assistants" value={metrics.regularAssistants} />
                </Col>
                <Col span={8}>
                  <Statistic title="Total Duration" value={metrics.totalDuration} />
                </Col>
                <Col span={8}>
                  <Statistic title="Average Duration" value={metrics.averageDuration} />
                </Col>
              </Row>
            </TabPane>
            <TabPane tab="Customers" key="2">
              {/* Add your customer management logic here */}
              <Title level={4}>Customer Management</Title>
              {/* Display customer-related data or components here */}
            </TabPane>
            <TabPane tab="Conversations" key="3">
              {/* Add your conversations management logic here */}
              <Title level={4}>Conversations Management</Title>
              {/* Display conversations-related data or components here */}
            </TabPane>
          </Tabs>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;
