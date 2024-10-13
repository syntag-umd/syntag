"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "antd";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  createPaymentLinkInput,
  type CreatePaymentLinkInput,
} from "~/features/billing/types";
import { api } from "~/server/trpc/clients/react";

export default function AccountBalance() {
  const router = useRouter();
  const [balanceModal, setBalanceModal] = React.useState(false);
  const form = useForm<CreatePaymentLinkInput>({
    defaultValues: { dollars: 5 },
    resolver: zodResolver(createPaymentLinkInput),
  });
  const createPaymentLink = api.billing.createPaymentLink.useMutation();
  const handlePaymentCreate = async (data: CreatePaymentLinkInput) => {
    const url = await createPaymentLink.mutateAsync(data);
    console.log("PAYMENT URL: ", url);
    if (url) {
      router.push(url);
    }
  };
  return (
    <div>
      <Dialog open={balanceModal} onOpenChange={setBalanceModal}>
        <DialogTrigger>
          <Button>Add to account balance</Button>
        </DialogTrigger>
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePaymentCreate)}>
              <DialogHeader>
                <h2>Add to account balance</h2>
              </DialogHeader>
              <div className="pb-12 pt-4">
                <FormField
                  control={form.control}
                  name="dollars"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              /* if (e.target.value === "") {
                                field.onChange(0);
                                return;
                              } */
                              const dollars = e.target.value;
                              /*   const dollars = Number(e.target.value);
                              if (isNaN(dollars)) {
                                field.onChange(0);
                                return;
                              } */
                              field.onChange(dollars);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Minimum is $5.00</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                ></FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  htmlType="button"
                  onClick={() => setBalanceModal(false)}
                >
                  Close
                </Button>
                <Button type="primary" htmlType="submit">
                  Continue
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
