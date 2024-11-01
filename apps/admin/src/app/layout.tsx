"use client";

import { ClerkProvider, SignedIn, SignedOut, UserButton, SignIn } from '@clerk/nextjs';
import { Layout, Menu } from 'antd';
import { UserOutlined, RobotOutlined, MessageOutlined } from '@ant-design/icons';
import Link from 'next/link';
import './globals.css';
import { useState } from 'react';

const { Sider } = Layout;


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [selectedTab, setSelectedTab] = useState("1");

  const handleMenuClick = (key: string) => {
    setSelectedTab(key);
  };

  return (
    <ClerkProvider>
      <html lang="en">

        <body>
          <header>
          </header>
          <main style={{ display: 'flex', minHeight: '100vh' }}>
            <SignedIn>
              {/* Sidebar visible only when signed in */}
              <Sider width={250} theme="dark">
                <div className="logo" />
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[selectedTab]}
                  onClick={({ key }) => handleMenuClick(key)}
                >
                  <Menu.Item key="1" icon={<UserOutlined />}>
                    <Link href="/admin/home">Home</Link> {/* Link to Home */}
                  </Menu.Item>
                  <Menu.Item key="2" icon={<RobotOutlined />}>
                    <Link href="/admin/customers">Customers</Link> {/* Link to Customers */}
                  </Menu.Item>
                  <Menu.Item key="3" icon={<MessageOutlined />}>
                    <Link href="/admin/conversations">Conversations</Link> {/* Link to Conversations */}
                  </Menu.Item>
                </Menu>
              </Sider>
              <div style={{ flex: 1, padding: '20px' }}>
                {/* Children content displayed to the right of the sidebar */}
                {children}
              </div>
            </SignedIn>
            <SignedOut>
              {/* Sign-In page displayed when signed out */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <SignIn routing="hash" />
              </div>
            </SignedOut>
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}


