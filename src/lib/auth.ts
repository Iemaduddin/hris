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
    // Kebijakan sandi: minimal 10 karakter (akun demo seed memakai 12+).
    minPasswordLength: 10,
    maxPasswordLength: 100,
  },
  // Rate-limit per IP (memori proses). Endpoint mobile memakai pembatas sendiri
  // di src/lib/rate-limit.ts karena memanggil auth.api langsung (lihat catatan).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 200,
    customRules: {
      "/sign-in/email": { window: 60, max: 30 },
      "/sign-up/email": { window: 300, max: 5 },
    },
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