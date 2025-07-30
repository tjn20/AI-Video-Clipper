import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import type { User } from "@prisma/client";
import { db } from "~/server/db";
import { comparePassword } from "~/lib/auth";
import { env } from "~/env";
import Stripe from "stripe";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GithubProvider({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email Address",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials): Promise<null | User> {
        if (!(credentials?.email || credentials?.password)) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;
        const user = await db.user.findUnique({
          where: {
            email,
          },
        });
        if (user?.password && (await comparePassword(user.password, password)))
          return user;
        return null;
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user: { email } }) {
      if (!email) return false;

      const user = await db.user.findUniqueOrThrow({
        where: {
          email,
        },
      });
      if (!user.stripeCustomerId) {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const stripeCustomerId = await stripe.customers.create({
          email: email.toLowerCase(),
        });
        await db.user.update({
          where: {
            email,
          },
          data: {
            stripeCustomerId: stripeCustomerId.id,
          },
        });
      }

      return true;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
  },
} satisfies NextAuthConfig;
