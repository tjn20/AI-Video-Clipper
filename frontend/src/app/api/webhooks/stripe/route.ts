import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "~/env";
import { db } from "~/server/db";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      return new NextResponse("Webhook verification failed", {
        status: 400,
      });
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const stripeCustomerId = session.customer as string;
      const retreivedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        {
          expand: ["line_items"],
        },
      );
      const linesItems = retreivedSession.line_items;
      if (linesItems && linesItems.data.length > 0) {
        const planStripePriceId = linesItems.data[0]?.price?.id ?? undefined;
        if (!planStripePriceId)
          return new NextResponse("Price is not included", {
            status: 400,
          });
        const { credits } = await db.creditPlan.findFirstOrThrow({
          where: {
            stripePriceId: planStripePriceId,
          },
          select: {
            credits: true,
          },
        });
        await db.user.update({
          where: {
            stripeCustomerId,
          },
          data: {
            credits: {
              increment: credits,
            },
          },
        });
      }
    }
    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    return new NextResponse("Webhook error", {
      status: 400,
    });
  }
}
