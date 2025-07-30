import { compare, hash } from "bcryptjs";

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function comparePassword(
  hashedPassword: string,
  password: string,
) {
  return compare(password, hashedPassword);
}
