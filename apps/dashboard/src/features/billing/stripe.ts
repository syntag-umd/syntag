import { env } from "~/env";
import Stripe from "stripe";
export const stripe = new Stripe(env.STRIPE_API_KEY);

export async function createStripeCustomer(
  external_id: string,
  email?: string,
  name?: string,
  pn?: string,
) {
  const stripe_customer = await stripe.customers.create({
    email: email,
    name: name,
    phone: pn,
    metadata: {
      external_id: external_id,
    },
  });
  return stripe_customer;
}
