import { stripe } from "./stripe";
import { env } from "~/env";
import { getBaseUrl } from "~/server/trpc/clients/shared";

/** Phone numbers and agents should both be modular composable features for flexibility.
 */

export class AccountBalance {
  // pricing for account balance. 1 quantity = 1 cent
  static ACCOUNT_BALANCE_PRICE_ID = env.STRIPE_ACCOUNT_BALANCE_PRICE_ID;
  // id of portal configuration
  static BILLING_PORTAL_PAYMENTS = env.STRIPE_BILLING_PORTAL_PAYMENTS;

  static createPaymentLink = async (
    stripeCustomerId: string,
    dollars: number,
  ) => {
    const checkout_session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: AccountBalance.ACCOUNT_BALANCE_PRICE_ID,
          quantity: Math.round(dollars * 100),
        },
      ],
      currency: "usd",
      mode: "payment",
      saved_payment_method_options: {
        payment_method_save: "enabled",
      },
      success_url: getBaseUrl(),
    });
    return checkout_session.url;
  };
}
