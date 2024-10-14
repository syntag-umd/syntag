import { env } from "~/env";
import type Stripe from "stripe";
import { stripe } from "../billing/stripe";
import { TRPCError } from "@trpc/server";

export class PhoneNumberBilling {
  static PRICE_ID = env.STRIPE_PHONE_NUMBER_PRICE_ID;
  /**Lookup key for phone number feature  */
  static FEATURE_KEY = env.STRIPE_PHONE_NUMBER_FEATURE_KEY;

  static PHONE_NUMBER_PRICE = 200;

  static async init(stripeCustomerId: string, existingSubscription?: string) {
    if (existingSubscription) {
      const subItem = await stripe.subscriptionItems.create({
        subscription: existingSubscription,
        price: PhoneNumberBilling.PRICE_ID,
      });
      return subItem;
    } else {
      const sub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: PhoneNumberBilling.PRICE_ID, quantity: 0 }],
      });
      return sub;
    }
  }

  /**Returnes the subscription item for phone number */
  static async getSubscriptionItem(
    subscriptions?: Stripe.Subscription[],
    stripeCustomerId?: string,
  ) {
    if (!subscriptions) {
      if (!stripeCustomerId)
        throw new Error("No customer id or subscriptions provided");

      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId, {
        expand: ["subscriptions"],
      });
      if (!stripeCustomer || stripeCustomer.deleted === true) {
        throw new Error("Not a valid stripe customer");
      }
      if (!stripeCustomer.subscriptions) {
        throw new Error("No subscriptions found");
      }
      subscriptions = stripeCustomer.subscriptions.data;
    }

    let subItem: undefined | Stripe.SubscriptionItem;

    for (const sub of subscriptions) {
      const subItems = sub.items.data;
      for (const si of subItems) {
        if (si.price.id === PhoneNumberBilling.PRICE_ID) {
          subItem = si;
          break;
        }
      }
      if (subItem) {
        break;
      }
    }

    if (!subItem) {
      throw new Error("Customer does not have a phone number subscription");
    }
    return subItem;
  }
  /** Checks if they are allowed to use phone numbers */
  static async isEntitled(stripeCustomerId: string) {
    const customersEntitlements =
      await stripe.entitlements.activeEntitlements.list({
        customer: stripeCustomerId,
      });

    for (const entitlement of customersEntitlements.data) {
      if (entitlement.lookup_key === PhoneNumberBilling.FEATURE_KEY) {
        return true;
      }
    }
    return false;
  }

  static async addPhoneNumber(stripeCustomerId: string) {
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ["subscriptions", "invoice_settings.default_payment_method"],
    });
    if (!stripeCustomer || stripeCustomer.deleted === true) {
      throw new Error("Not a valid stripe customer");
    }
    const subItem = await PhoneNumberBilling.getSubscriptionItem(
      stripeCustomer.subscriptions?.data,
    );
    const amountPhone = PhoneNumberBilling.PHONE_NUMBER_PRICE;
    const currencyPhone = "usd";
    if (stripeCustomer.balance + amountPhone <= 0) {
      await stripe.customers.createBalanceTransaction(stripeCustomerId, {
        amount: amountPhone,
        currency: currencyPhone,
        description: "Phone number purchase",
      });
    } else {
      let method: string | undefined;
      const default_method =
        stripeCustomer.invoice_settings.default_payment_method;
      if (typeof default_method === "string") {
        method = default_method;
      } else if (default_method) {
        method = default_method.id;
      }
      if (!method) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No payment method found",
        });
      }
      const paymentIntent = await stripe.paymentIntents
        .create({
          amount: amountPhone,
          currency: currencyPhone,
          customer: stripeCustomerId,
          payment_method: method,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never",
          },
        })
        .catch((e) => {
          console.error(e);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Could not create payment intent for phone number",
          });
        });
      if (paymentIntent.status !== "succeeded") {
        if (paymentIntent.status === "processing") {
          console.error(
            "Payment intent is processing",
            stripeCustomerId,
            paymentIntent.id,
          );
          await stripe.paymentIntents.cancel(paymentIntent.id);
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment intent did not succeed",
        });
      }
    }

    await stripe.subscriptionItems.update(subItem.id, {
      quantity: (subItem.quantity ?? 0) + 1,
      proration_behavior: "none",
    });

    return true;
  }
  /** This just removes it from stripe. It does not change the twilio */
  static async deletePhoneNumber(stripeCustomerId: string) {
    const subItem = await PhoneNumberBilling.getSubscriptionItem(
      undefined,
      stripeCustomerId,
    );

    const quantity =
      subItem.quantity && subItem.quantity > 0 ? subItem.quantity - 1 : 0;
    const mod = await stripe.subscriptionItems.update(subItem.id, {
      quantity: quantity,
      proration_behavior: "none",
    });
    return mod;
  }
}
