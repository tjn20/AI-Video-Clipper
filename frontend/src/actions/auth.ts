"use server";

import Stripe from "stripe";
import { env } from "~/env";
import { hashPassword } from "~/lib/auth";
import { SIGNUP_SHCEMA, type SignUpForm } from "~/schemas/auth";
import { db } from "~/server/db";

interface Response {
  message: string;
  status: number;
}

export async function signUp(data: SignUpForm): Promise<Response> {
  const validatedData = SIGNUP_SHCEMA.safeParse(data);
  if (!validatedData.success) {
    const errorMessage =
      validatedData.error.issues[0]?.message ?? "Invalid input";
    return {
      message: errorMessage,
      status: 422,
    };
  }

  const { name, email, password } = validatedData.data;
  try {
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      return {
        status: 422,
        message: "User Already Exists with this email",
      };
    }

    const hashedPass = await hashPassword(password);
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const stripCustomer = await stripe.customers.create({
      email: email.toLowerCase(),
    });

    await db.user.create({
      data: {
        name,
        email,
        password: hashedPass,
        stripeCustomerId: stripCustomer.id,
      },
    });

    return {
      message: "User created successfully",
      status: 201,
    };
  } catch (error) {
    return {
      message: "Something Went Wrong!",
      status: 400,
    };
  }
}
