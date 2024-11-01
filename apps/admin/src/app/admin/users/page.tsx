"use client"; // Add this directive at the top of the file
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { SignOutButton } from '@clerk/nextjs';
import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button } from 'antd';

const { Header, Content } = Layout;
const { Title } = Typography;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

type User = {
  name: string;
  uuid: string;
  email: string;
  createdAt: string;
  account_balance: number;
  is_admin_account: boolean;
};

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10; // Adjust as needed

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('user')
        .select('*');

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(data || []);
    };

    fetchUsers();
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
        <Title level={3} style={{ margin: 0 }}>Users Management</Title>
        <SignOutButton redirectUrl="/sign-in" />
      </Header>

      <Content style={{ margin: '24px 16px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {currentUsers.map((user) => (
            <Link key={user.uuid} href={`/admin/users/${user.uuid}`} passHref>
               <Button
                    style={{ margin: '5px' }}
                  >
                    {user.name || 'Unknown User'}
                  </Button>
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <Button onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
        </div>
      </Content>
    </Layout>
  );
};

export default AdminDashboard;
