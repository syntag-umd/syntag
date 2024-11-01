"use client"; // Make sure this is the first line in your file

import '../../../globals.css'; // Adjust the path based on your project structure
import { createClient } from '@supabase/supabase-js';
import { SignOutButton } from '@clerk/nextjs';
import React, { useEffect, useState } from 'react';
import { Layout, Typography } from 'antd';
import { useParams } from 'next/navigation'; // Use useParams from next/navigation

const { Header, Content } = Layout;
const { Title } = Typography;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

type User = {
  name: string;
  uuid: string;
  createdAt: string; // Assuming it's in string format (e.g., ISO 8601)
  email: string;
  account_balance: number; // Assuming it's a number
  is_admin_account: boolean; // Assuming it's a boolean
};

const UserProfile: React.FC = () => {
  const { uuid } = useParams(); // Use useParams to get the UUID from the URL
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!uuid) return; // Ensure uuid is available before making the request

      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('uuid', uuid)
        .single(); // Fetch a single user by UUID

      if (error) {
        console.error("Error fetching user:", error);
        return;
      }
      setUser(data);
      setLoading(false); // Update loading state
    };

    fetchUser();
  }, [uuid]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>User Profile</Title>
        <SignOutButton redirectUrl="/sign-in" />
      </Header>

      <Content style={{ margin: '24px 16px 0' }}>
        {loading ? (
          <p>Loading user information...</p>
        ) : user ? (
          <div className="user-profile">
            <Title level={4}>{user.name}</Title>
            <div className="user-info">
              <div className="info-item">
                <span className="info-label">UUID:</span>
                <span className="info-value">{user.uuid}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Created At:</span>
                <span className="info-value">{new Date(user.createdAt).toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Account Balance:</span>
                <span className="info-value">${user.account_balance}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Admin Account:</span>
                <span className="info-value">{user.is_admin_account ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        ) : (
          <p>User not found</p>
        )}
      </Content>
    </Layout>
  );
};

export default UserProfile;
