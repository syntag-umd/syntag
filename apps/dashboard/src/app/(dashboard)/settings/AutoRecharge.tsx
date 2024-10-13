"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Select, Spin } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { ReactNode, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Icons } from "~/components/Icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button as RadixButton } from "~/components/ui/button";
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
  updateAutoRechargeInput,
  type UpdateAutoRechargeInput,
} from "~/features/billing/types";
import { api } from "~/server/trpc/clients/react";

export default function AutoRecharge() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const apiUtils = api.useUtils();
  const { data: userData } = api.user.get.useQuery(void 0, {
    placeholderData: (prev) => prev,
  });
  useEffect(() => {
    if (userData) {
      if (userData.account_balance_recharge_threshold) {
        form.setValue(
          "threshold",
          userData?.account_balance_recharge_threshold,
        );
      }
      if (userData.account_balance_recharge_to) {
        form.setValue("to", userData?.account_balance_recharge_to);
      }
      if (userData.account_balance_payment_method) {
        form.setValue(
          "payment_method_id",
          userData?.account_balance_payment_method,
        );
      }
    }
  }, [userData]);
  const { data: billingData, isLoading: isBillingDataLoading } =
    api.billing.get.useQuery(void 0, {
      placeholderData: (prev) => prev,
    });
  const { data: paymentMethodUrl, isLoading: isPaymentMethodLoading } =
    api.billing.getPaymentPortal.useQuery();
  const [rechargeModal, setRechargeModal] = React.useState(false);
  const form = useForm<UpdateAutoRechargeInput>({
    defaultValues: {
      threshold: userData?.account_balance_recharge_threshold ?? undefined,
      to: userData?.account_balance_recharge_to ?? undefined,
      payment_method_id: userData?.account_balance_payment_method ?? undefined,
    },
    resolver: zodResolver(updateAutoRechargeInput),
  });
  const updateAutoRecharge = api.billing.updateAutoRecharge.useMutation();
  const handleAutoRecharge = async (data: UpdateAutoRechargeInput) => {
    setIsSubmitting(true);
    try {
      const updated_user = await updateAutoRecharge.mutateAsync(data);
      apiUtils.user.get.setData(void 0, updated_user);
      setRechargeModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  const turnOffAutoRecharge = api.billing.turnOffAutoRecharge.useMutation();
  const handleTurnOffAutoRecharge = async () => {
    setIsSubmitting(true);
    try {
      const updated_user = await turnOffAutoRecharge.mutateAsync();
      apiUtils.user.get.setData(void 0, updated_user);
      setRechargeModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-[1px] border-x-0 border-input px-2 py-2">
      <Dialog open={rechargeModal} onOpenChange={setRechargeModal}>
        {!userData?.account_balance_recharge_threshold ||
        !userData?.account_balance_recharge_to ||
        !userData?.account_balance_payment_method ? (
          <>
            <h6 className="flex gap-2">
              <Icons.close className="stroke-destructive" /> Auto-recharge is
              off
            </h6>
            <p className="text-xs">
              If your balance reaches $0, your receptionists will turn off
              <br />
              <DialogTrigger>
                <span className="text-primary underline hover:text-primary-hover">
                  Enable Automatic recharge
                </span>
              </DialogTrigger>{" "}
              to automatically add to your balance
            </p>
          </>
        ) : (
          <>
            <h6 className="flex gap-2">
              <Icons.check className="stroke-green-700" /> Auto-recharge is on
            </h6>
            <p className="text-xs">
              If your balance reaches $0, your receptionists will turn off
              <br />
              <DialogTrigger>
                <span className="text-primary underline hover:text-primary-hover">
                  Edit Automatic recharge
                </span>
              </DialogTrigger>
            </p>
          </>
        )}

        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAutoRecharge)}>
              <DialogHeader>
                <h2>Set Up Auto-recharge</h2>
              </DialogHeader>
              {isBillingDataLoading ? (
                <div className="flex justify-center py-2">
                  <Spin />
                </div>
              ) : (
                <>
                  <div className="space-y-8 pb-12 pt-4">
                    <FormField
                      control={form.control}
                      name="threshold"
                      render={({ field }) => {
                        return (
                          <FormItem>
                            <FormLabel>Threshold Amount</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="5"
                                {...field}
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              When your account balance reaches this amount, the
                              auto-recharge will trigger.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="to"
                      render={({ field }) => {
                        return (
                          <FormItem>
                            <FormLabel>Set your account balance to</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="10"
                                {...field}
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              This is the amount your account balance will be
                              after the auto-recharge.{" "}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="payment_method_id"
                      render={({ field }) => {
                        return (
                          <FormItem
                            id="payment-method-select"
                            className="flex flex-col"
                          >
                            <FormLabel>Payment Method</FormLabel>
                            <FormControl>
                              {billingData ? (
                                billingData.payment_methods &&
                                billingData.payment_methods.length > 0 ? (
                                  <Select
                                    value={field.value}
                                    onSelect={(value) => {
                                      field.onChange(value);
                                    }}
                                    getPopupContainer={() =>
                                      document.getElementById(
                                        "payment-method-select",
                                      )!
                                    }
                                  >
                                    {billingData.payment_methods?.map((pm) => (
                                      <Select.Option key={pm.id} value={pm.id}>
                                        {pm.card.brand.charAt(0).toUpperCase() +
                                          pm.card.brand.slice(1)}{" "}
                                        ending in {pm.card.last4}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                ) : (
                                  <div className="py-2 text-xs text-destructive">
                                    You don&apos;t have any payment methods.
                                    Please add one to use auto-recharge.
                                  </div>
                                )
                              ) : (
                                <Spin />
                              )}
                            </FormControl>
                            <FormDescription>
                              Choose a payment method that will be used to auto
                              recharge
                              <br />
                              <Link
                                className="text-primary underline hover:text-primary-hover"
                                href={paymentMethodUrl!}
                                target="_blank"
                              >
                                Manage Payment Methods
                              </Link>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <RadixButton
                        size={"sm"}
                        variant={"destructive"}
                        type="button"
                        onClick={() => handleTurnOffAutoRecharge()}
                      >
                        Turn Off
                      </RadixButton>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        htmlType="button"
                        onClick={() => setRechargeModal(false)}
                      >
                        Close
                      </Button>

                      <Button
                        type="primary"
                        htmlType="submit"
                        disabled={
                          isBillingDataLoading ||
                          isPaymentMethodLoading ||
                          isSubmitting
                        }
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
