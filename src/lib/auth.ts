import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "EMPLOYEE",
        input: false,
      },
    },
  },
  // PRD Bag. 9 — autentikasi token untuk mobile apps.
  // Web tetap memakai cookie; mobile memakai `Authorization: Bearer <sessionToken>`.
  plugins: [bearer()],
});