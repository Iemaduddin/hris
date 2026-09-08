import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";

export type ApiRole = "SUPER_ADMIN" | "ADMIN_HR" | "MANAJER" | "FINANCE" | "EMPLOYEE";

export type ApiContext = {
	userId: string;
	role: ApiRole;
	karyawanId: string | null;
};

export function ok<T>(data: T, status = 200): NextResponse {
	return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400, details?: unknown): NextResponse {
	return NextResponse.json({ success: false, error, ...(details ? { details } : {}) }, { status });
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		return body && typeof body === "object" ? body : null;
	} catch {
		return null;
	}
}

export function str(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolusi sesi untuk API v1 (cookie-based, kompatibel dengan login web).
 * Mengembalikan user + peran + tautan karyawan (1-1 Sprint 3).
 */
export async function requireApiSession(request: NextRequest): Promise<ApiContext | null> {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return null;

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { id: true, role: true },
	});
	if (!user) return null;

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: user.id },
		select: { id: true },
	});

	return { userId: user.id, role: user.role as ApiRole, karyawanId: karyawan?.id ?? null };
}

export function requireRole(ctx: ApiContext, roles: ApiRole[]): boolean {
	return roles.includes(ctx.role);
}

export function isHr(ctx: ApiContext): boolean {
	return ctx.role === "SUPER_ADMIN" || ctx.role === "ADMIN_HR";
}
