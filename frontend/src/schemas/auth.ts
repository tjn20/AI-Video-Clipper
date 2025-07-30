import { email } from "node_modules/zod/v4/core/regexes.cjs";
import z from "zod";

export const SIGNUP_SHCEMA = z.object({
  name: z
    .string()
    .min(
      3,
      "Min of 3 characters is allowed",
    ) /** Possible to add more validations */,
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must contain at least 8 character(s)")
    .max(30, "Password must be under 30 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one digit")
    .regex(/[\W_]/, "Password must contain at least one special character"),
});

export type SignUpForm = z.infer<typeof SIGNUP_SHCEMA>;

export const SIGNIN_SCHEMA = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string(),
});

export type SignInForm = z.infer<typeof SIGNIN_SCHEMA>;
