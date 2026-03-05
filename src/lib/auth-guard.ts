import type { UserRole } from "@/generated/prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

async function getSession() {
	const requestHeaders = await headers();
	return auth.api.getSession({
		headers: requestHeaders,
	});
}

export async function getCurrentSession() {
	return getSession();
}

export async function requireAuthenticatedUser(redirectTo = "/login") {
	const session = await getSession();

	if (!session) {
		redirect(redirectTo);
	}

	return session;
}

export async function requireUserRole(roles: UserRole[], redirectTo = "/") {
	const session = await requireAuthenticatedUser();
	const currentUser = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { role: true },
	});

	if (!currentUser || !roles.includes(currentUser.role)) {
		redirect(redirectTo);
	}

	return {
		session,
		role: currentUser.role,
	};
}

export async function canManageUsers() {
	const session = await getSession();
	if (!session) return false;

	const currentUser = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { role: true },
	});

	if (!currentUser) return false;
	return currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";
}
