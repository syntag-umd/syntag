import { env } from "~/env";
import { stripe } from "../billing/stripe";

export class AgentBilling {
  // AGENT_USAGE is for the subscription method
  static AGENT_USAGE_PRICE_ID = env.STRIPE_AGENT_USAGE_PRICE_ID;

  static async initAgentUsage(
    stripeCustomerId: string,
    existingSubscription: string,
  ) {
    if (existingSubscription) {
      const subItem = await stripe.subscriptionItems.create({
        subscription: existingSubscription,
        price: AgentBilling.AGENT_USAGE_PRICE_ID,
      });
      return subItem;
    } else {
      const sub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: AgentBilling.AGENT_USAGE_PRICE_ID }],
      });
      return sub;
    }
  }
}
