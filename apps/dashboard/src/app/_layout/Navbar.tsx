"use client";

import React, { useState } from "react";
import { env } from "~/env";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useTheme } from "next-themes";
import { Button, Modal, Input, Form, message } from "antd";
import { cn } from "~/lib/utils";
import { MobileSidebar } from "./sidebar/MobileSidebar";
import { request } from "http";
import { names } from "@ctrl/tinycolor";
import { api } from "~/server/trpc/clients/react";

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const submitRequestQuery = api.help.submitRequest.useMutation();

  const handleSubmit = async (values: {problem: string}) => {

    const { problem } = values;

    await submitRequestQuery.mutateAsync({ problem },
      {
        onSuccess: () => {
          void message.success("Request submitted successfully");
        },
        onError: (error: { message: string }) => {
          void message.error(error.message);
        },
      }
    );

  
    handleCancel(); // Close modal after submission
  };
  

  return (
    <nav className="flex justify-between h-navbar-height items-center pl-4 pr-6">
      <div className={cn("block md:!hidden")}>
        <MobileSidebar />
      </div>
      <div className="flex items-center gap-4 ml-auto p-4 text-muted-foreground">
        <Link
          href="https://calendly.com/vikram-from-syntag/30min"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact Sales
        </Link>
        <Button type="link" size="large" onClick={showModal}>
          <div className="text-muted-foreground" >Help</div>
        </Button>
        <Button
          onClick={() => {
            if (resolvedTheme === "light") {
              setTheme("dark");
            } else {
              setTheme("light");
            }
          }}
          type="text"
          className="hover:bg-secondary-hover"
        >
          {resolvedTheme === "dark" ? (
            <MdDarkMode size={"1.5rem"} />
          ) : (
            <MdLightMode size={"1.5rem"} color="var(--muted-foreground)" />
          )}
        </Button>
        <UserButton userProfileUrl="/settings" />
      </div>

      {/* Help Modal */}
      <Modal
        title={<div style={{marginBottom: "1rem"}}>
          <div className="text-xl">
            Submit a help request
          </div>
          <span className="text-muted-foreground font-normal text-sm">Experiencing issues? Submit a help request and a member of our team will get back to you in 24 hours.</span>
          </div>
        }
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="Problem"
            name="problem"
            rules={[{ required: true, message: "Please describe your problem" }]}
          >
            <Input.TextArea rows={4} placeholder="Describe your issue" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </nav>
  );
}
