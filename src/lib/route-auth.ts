import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export type RouteUser = { id: string; role: string };

/** Sesi untuk API route download (cookie-based, pola files route). */
export async function getRouteUser(): Promise<RouteUser | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  return user;
}

export function isFinanceRole(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN_HR" || role === "FINANCE";
}
