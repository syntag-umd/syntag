import { type NextRequest, NextResponse } from "next/server";
import { createStripeCustomer, stripe } from "~/features/billing/stripe";
import { db } from "~/server/db";
import { getBaseUrl } from "~/server/trpc/clients/shared";
import { api } from "~/server/trpc/clients/server";

export async function GET(req: NextRequest) {
  const redirect_path = req.nextUrl.searchParams.get("redirect_path");
  let user = await api.user.get();
  if (!user) {
    return NextResponse.json({ error: "No user" }, { status: 401 });
  }

  if (!user.stripe_customer_id) {
    user = await db.$transaction(
      async (db) => {
        const stripe_customer = await createStripeCustomer(
          user!.uuid,
          user!.email ?? undefined,
          user!.name ?? undefined,
          user!.pn ?? undefined,
        );

        user = await db.user.update({
          where: { uuid: user!.uuid },
          data: { stripe_customer_id: stripe_customer.id },
        });

        return { ...user };
      },
      { isolationLevel: "Serializable" },
    );
  }
  if (!user.stripe_customer_id) {
    return NextResponse.json(
      { error: "Not conencted to stripe" },
      { status: 403 },
    );
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: getBaseUrl() + (redirect_path ?? "/settings"),
  });

  return NextResponse.redirect(session.url);
}
