"use client";

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { MdArrowForward } from "react-icons/md";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { ScrollArea } from "~/components/ui/scroll-area";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import {
  type AgentSettingsFormSchemaType,
  agentSettingsFormSchema,
} from "./types";

import ErrorDialog from "../ErrorDialog";
import { useRouter } from "next/navigation";

export default function VoiceAgentDrawer() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | undefined>(
    undefined,
  );
  const router = useRouter();
  const form = useForm<AgentSettingsFormSchemaType>({
    resolver: zodResolver(agentSettingsFormSchema),
    defaultValues: {
      backgroundNoise: "office",
    },
  });

  const agentMutation = api.agent.create.useMutation();
  async function onSubmit(values: AgentSettingsFormSchemaType) {
    setLoading(true)
    try {
      await agentMutation.mutateAsync(values);
      onClose();
      router.refresh();
    } catch (e) {
      if (e instanceof Error) {
        setDialogMessage(e.message);
      } else {
        setDialogMessage("An unknown error occured");
      }
    } finally {
      setLoading(false);
    }
  }
  const name = form.watch("name");
  return (
    <div>
      <ErrorDialog message={dialogMessage} setMessage={setDialogMessage} />
      <Button onClick={onOpen}>Create</Button>
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size={"xs"}>
        <DrawerOverlay />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DrawerContent
              className="bg-background pt-8"
              sx={{ background: "var(--background)" }}
            >
              <DrawerHeader className="flex items-center justify-between">
                Options
                <Button variant="outline" size={"icon"} onClick={onClose}>
                  <MdArrowForward
                    className=" border-foreground"
                    size={"1.375rem"}
                  />
                </Button>
              </DrawerHeader>
              <ScrollArea className="h-full rounded-md">
                <DrawerBody className="grid gap-6">
                  <div className="bg-card flex flex-col gap-3 px-3 py-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => {
                        return (
                          <FormItem>
                            <FormLabel>Agent Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="profilePicUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Pic URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="bg-card flex flex-col gap-3 px-3 py-3">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPT Model</FormLabel>

                          <Select {...field} onValueChange={field.onChange}>
                            <SelectTrigger className="">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="border-ring z-[5000]">
                              <SelectGroup>
                                <SelectItem value="GPT_4">GPT-4</SelectItem>
                                <SelectItem value="GPT_3_5_TURBO">
                                  GPT-3.5 Turbo
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructions</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={6}
                              placeholder="Answer questions about the University of Maryland."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-card flex flex-col gap-3 px-3 py-3">
                    <FormField
                      control={form.control}
                      name="firstMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First message</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              placeholder={`Hello, this is ${name ?? "John Doe"}. How can I help you today?`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="voice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice</FormLabel>
                          <Select {...field} onValueChange={field.onChange}>
                            <SelectTrigger className="">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="border-ring z-[5000]">
                              <SelectGroup>
                                <SelectItem value="luna">Luna</SelectItem>
                                <SelectItem value="helios">Helios</SelectItem>
                                <SelectItem value="athena">Athena</SelectItem>
                                <SelectItem value="orion">Orion</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="backgroundNoise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background Noise</FormLabel>

                          <Select {...field} onValueChange={field.onChange}>
                            <SelectTrigger className="">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="border-ring z-[5000]">
                              <SelectGroup>
                                <SelectItem value="off">Off</SelectItem>
                                <SelectItem value="office">Office</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </DrawerBody>
              </ScrollArea>

              <DrawerFooter className=" flex-row gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}> 
                      {`${(loading) ? "Saving..." : "Save"}`}
                 </Button>
              </DrawerFooter>
            </DrawerContent>
          </form>
        </Form>
      </Drawer>
    </div>
  );
}
