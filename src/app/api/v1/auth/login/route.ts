import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { fail, readJson, str } from "@/src/lib/api-v1";

export async function POST(request: NextRequest) {
	const body = await readJson(request);
	const email = str(body?.["email"]).toLowerCase();
	const password = typeof body?.["password"] === "string" ? body["password"] : "";

	if (!email || !password) {
		return fail("Email dan password wajib diisi.", 422);
	}

	const res = await auth.api.signInEmail({
		body: { email, password },
		headers: request.headers,
		asResponse: true,
	});

	if (!res.ok) {
		let message = "Email atau password salah.";
		try {
			const parsed = (await res.json()) as { message?: string };
			if (parsed?.message) message = parsed.message;
		} catch {
			// abaikan, pakai pesan default
		}
		return fail(message, res.status === 429 ? 429 : 401);
	}

	// Akun dinonaktifkan (mis. sudah resign) → tolak + cabut sesi barusan.
	const akun = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
	if (akun && akun.isActive === false) {
		await prisma.session.deleteMany({ where: { userId: akun.id } });
		return fail("Akun sudah dinonaktifkan. Hubungi HR.", 403);
	}

	let payload: Record<string, unknown> = {};
	try {
		payload = (await res.json()) as Record<string, unknown>;
	} catch {
		payload = {};
	}

	const headers = new Headers();
	const cookies: string[] = [];
	res.headers.forEach((value, key) => {
		if (key.toLowerCase() === "set-cookie") {
			headers.append("set-cookie", value);
			cookies.push(value);
		}
	});

	// PRD mobile Bag. 7-B1: mobile menyimpan session token lalu mengirimkannya
	// sebagai `Authorization: Bearer <token>` (plugin bearer() di src/lib/auth.ts).
	// Cookie diutamakan; fallback ke token yang sudah dikembalikan better-auth.
	const cookieToken = extractSessionToken(cookies);
	const token = cookieToken ?? (typeof payload.token === "string" ? payload.token : undefined);

	return NextResponse.json(
		{ success: true, data: { ...payload, token } },
		{ status: 200, headers },
	);
}

/**
 * Ambil nilai session token dari header Set-Cookie.
 * Nama cookie better-auth dapat dikonfigurasi, jadi dicocokkan longgar.
 */
function extractSessionToken(cookies: string[]): string | undefined {
	for (const cookie of cookies) {
		const part = cookie.split(";")[0];
		const eq = part.indexOf("=");
		if (eq < 0) continue;
		const name = part.slice(0, eq).trim();
		if (name === "better-auth.session_token" || name.endsWith(".session_token")) {
			return decodeURIComponent(part.slice(eq + 1).trim());
		}
	}
	return undefined;
}
