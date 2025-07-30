"use server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import Stripe from "stripe";
import { env } from "~/env";

export async function createStripeCheckoutSession(planId: string): Promise<{
  status: number;
  message: string;
  url?: string;
}> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      status: 401,
      message: "Unauthorized",
    };

  const { stripeCustomerId } = await db.user.findFirstOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      stripeCustomerId: true,
    },
  });

  if (!stripeCustomerId)
    return {
      status: 400,
      message: "User Not Registered in Stripe",
    };

  const { stripePriceId } = await db.creditPlan.findUniqueOrThrow({
    where: {
      slug: planId,
    },
    select: {
      stripePriceId: true,
    },
  });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });

  const stripeSession = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    customer: stripeCustomerId,
    mode: "payment",
    success_url: `${env.BASE_URL}/?sucess=true`,
  });

  if (!stripeSession.url)
    return {
      status: 400,
      message: "Something Went Wrong with Payment!",
    };

  return {
    status: 200,
    message: "Succesful Payment Setup",
    url: stripeSession.url,
  };
}
