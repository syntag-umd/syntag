import { TRPCError } from "@trpc/server";
import type Stripe from "stripe";
import { stripe } from "~/features/billing/stripe";
import { createTRPCRouter, userProcedure } from "~/server/trpc/trpc";
import { AccountBalance } from "./AccountBalance";
import { z } from "zod";
import { toDisplayCredit } from "./stripe_utils";
import { createPaymentLinkInput, updateAutoRechargeInput } from "./types";
import { getBaseUrl } from "~/server/trpc/clients/shared";
import { fastApiFetch } from "~/requests";
import { PhoneNumberBilling } from "../phone-numbers/billing";

export const billingRouter = createTRPCRouter({
  initPhoneSubscription: userProcedure.mutation(async ({ ctx }) => {
    const dbUser = await ctx.db.user.findFirst({
      where: { uuid: ctx.auth.sessionClaims.external_id },
    });
    if (!dbUser) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
    }
    if (!dbUser.stripe_customer_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User does not have a stripe customer id",
      });
    }
    await PhoneNumberBilling.init(dbUser.stripe_customer_id);
    return true;
  }),

  get: userProcedure
    .output(
      z.object({
        invoiceCost: z.string(),
        deadline: z.string().optional(),
        account_balance: z.number().optional(),
        payment_methods: z
          .array(
            z.object({
              type: z.literal("card"),
              id: z.string(),
              card: z.object({
                brand: z.string(),
                exp_month: z.number(),
                exp_year: z.number(),
                last4: z.string(),
              }),
            }),
          )
          .optional(),
      }),
    )
    .query(async ({ ctx }) => {
      const dbUser = await ctx.db.user.findFirst({
        where: { uuid: ctx.auth.sessionClaims.external_id },
      });
      if (!dbUser) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
      }
      if (!dbUser.stripe_customer_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a stripe customer id",
        });
      }
      const stripeCustomer_p = stripe.customers.retrieve(
        dbUser.stripe_customer_id,
      );
      const payment_methods_p = stripe.customers.listPaymentMethods(
        dbUser.stripe_customer_id,
        { type: "card" },
      );

      // go through all invoices and add them together
      //or re-word so its clear that that its only showing their next invoice (and late payments)

      let invoice: Stripe.Response<Stripe.UpcomingInvoice>;
      try {
        invoice = await stripe.invoices.retrieveUpcoming({
          customer: dbUser.stripe_customer_id,
        });
      } catch (e) {
        if (e instanceof stripe.errors.StripeInvalidRequestError) {
          return {
            invoiceCost: Number(0).toFixed(2),
          };
        } else {
          throw e;
        }
      }
      const stripeCustomer = await stripeCustomer_p;
      if (stripeCustomer.deleted === true) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not a valid stripe customer",
        });
      }
      const payment_methods = await payment_methods_p;
      const pm_data =
        payment_methods.data as unknown as (Stripe.PaymentMethod & {
          type: "card";
          card: Stripe.PaymentMethod.Card;
        })[];

      const invoiceCost = invoice.amount_remaining / 100;

      let invoiceDeadline: Date;
      if (invoice.collection_method === "send_invoice") {
        invoiceDeadline = new Date(invoice.due_date! * 1000);
      } else {
        invoiceDeadline = new Date(invoice.next_payment_attempt! * 1000);
      }

      const formattedDeadline = invoiceDeadline.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      console.log(pm_data);
      return {
        deadline: formattedDeadline,
        invoiceCost: invoiceCost.toFixed(2),
        account_balance: dbUser.account_balance,
        payment_methods: pm_data,
      };
    }),
  /**Retruns negative if they have credit, positive if they are in "debt" */
  getBalance: userProcedure.query(async ({ ctx }) => {
    const dbUser = await ctx.db.user.findFirst({
      where: { uuid: ctx.auth.sessionClaims.external_id },
    });
    if (!dbUser) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
    }
    if (!dbUser.stripe_customer_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User does not have a stripe customer id",
      });
    }
    const stripeCustomer = await stripe.customers.retrieve(
      dbUser.stripe_customer_id,
    );

    if (stripeCustomer.deleted === true) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not a valid stripe customer",
      });
    }
    return stripeCustomer.balance;
  }),
  createPaymentLink: userProcedure
    .input(createPaymentLinkInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirstOrThrow({
        where: { uuid: ctx.auth.sessionClaims.external_id },
      });
      if (!user.stripe_customer_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a stripe customer id",
        });
      }
      const url = await AccountBalance.createPaymentLink(
        user.stripe_customer_id,
        input.dollars,
      );
      return url;
    }),
  getPaymentPortal: userProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findFirstOrThrow({
      where: { uuid: ctx.auth.sessionClaims.external_id },
    });
    if (!user.stripe_customer_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User does not have a stripe customer id",
      });
    }
    const return_url = getBaseUrl() + "/settings";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: return_url,
      configuration: AccountBalance.BILLING_PORTAL_PAYMENTS,
    });
    return session.url;
  }),
  updateAutoRecharge: userProcedure
    .input(updateAutoRechargeInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirstOrThrow({
        where: { uuid: ctx.auth.sessionClaims.external_id },
      });
      const payment_method = await stripe.paymentMethods.retrieve(
        input.payment_method_id,
        { expand: ["customer"] },
      );
      console.log("PAYMENT_METHOD", payment_method);

      if (
        (payment_method.customer as Stripe.Customer).id !==
        user.stripe_customer_id
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment method does not belong to user",
        });
      }
      const updated_user = await ctx.db.user.update({
        where: { uuid: user.uuid },
        data: {
          account_balance_recharge_threshold: input.threshold,
          account_balance_recharge_to: input.to,
          account_balance_payment_method: input.payment_method_id,
        },
      });
      void fastApiFetch(
        "/billing/auto-recharge",
        {
          method: "POST",
        },
        { userApiKey: user.api_key },
      );
      return updated_user;
    }),
  turnOffAutoRecharge: userProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findFirstOrThrow({
      where: { uuid: ctx.auth.sessionClaims.external_id },
    });
    const updated_user = await ctx.db.user.update({
      where: { uuid: user.uuid },
      data: {
        account_balance_recharge_threshold: null,
        account_balance_recharge_to: null,
        account_balance_payment_method: null,
      },
    });
    return updated_user;
  }),
});
