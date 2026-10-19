import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import { fail, ok, readJson, requireApiSession } from "@/src/lib/api-v1";
import { hitRateLimit, clearRateLimit, rateLimitKey } from "@/src/lib/rate-limit";

/**
 * P6-5 — ganti kata sandi dari dalam aplikasi mobile.
 * Memakai endpoint `change-password` better-auth (verifikasi sandi lama +
 * kebijakan panjang sandi yang sama dengan web), lalu mencabut sesi lain.
 */

const MIN_PANJANG = 10;

/** Ambil `code`/`message` dari APIError better-auth (bisa berupa Error biasa). */
function bacaGalat(error: unknown): { code: string; message: string } {
	const body = (error as { body?: { code?: unknown; message?: unknown } } | null)?.body;
	const code = typeof body?.code === "string" ? body.code : "";
	const message = typeof body?.message === "string" ? body.message : "";
	return { code, message };
}

export async function POST(request: NextRequest) {
	const ctx = await requireApiSession(request);
	if (!ctx) return fail("Unauthorized.", 401);

	const batas = hitRateLimit(rateLimitKey(request, "ubah-sandi", ctx.userId), 5, 60);
	if (!batas.ok) {
		return fail(
			`Terlalu banyak percobaan ubah kata sandi. Coba lagi dalam ${batas.retryAfterSeconds} detik.`,
			429,
		);
	}

	const body = await readJson(request);
	// Sandi tidak di-trim: spasi di awal/akhir tetap bagian dari sandi.
	const currentPassword =
		typeof body?.["currentPassword"] === "string" ? (body["currentPassword"] as string) : "";
	const newPassword = typeof body?.["newPassword"] === "string" ? (body["newPassword"] as string) : "";

	if (!currentPassword || !newPassword) {
		return fail("Kata sandi saat ini dan kata sandi baru wajib diisi.", 422);
	}
	if (newPassword.length < MIN_PANJANG) {
		return fail(`Kata sandi baru minimal ${MIN_PANJANG} karakter.`, 422);
	}
	if (newPassword === currentPassword) {
		return fail("Kata sandi baru harus berbeda dari kata sandi saat ini.", 422);
	}

	try {
		const result = await auth.api.changePassword({
			body: { currentPassword, newPassword, revokeOtherSessions: true },
			headers: request.headers,
		});

		// Sesi lain dicabut; sesi perangkat ini diganti token baru agar tetap sah.
		const token = typeof result?.token === "string" ? result.token : null;
		// Sandi lama terbukti benar → buka kembali hitungan pembatas.
		clearRateLimit(rateLimitKey(request, "ubah-sandi", ctx.userId));
		return ok({ message: "Kata sandi berhasil diubah. Sesi di perangkat lain sudah diputus.", token });
	} catch (error) {
		const { code, message } = bacaGalat(error);
		console.warn("[api] Ubah kata sandi gagal:", code || message || error);

		switch (code) {
			case "INVALID_PASSWORD":
				return fail("Kata sandi saat ini salah.", 400);
			case "PASSWORD_TOO_SHORT":
				return fail(`Kata sandi baru minimal ${MIN_PANJANG} karakter.`, 422);
			case "PASSWORD_TOO_LONG":
				return fail("Kata sandi baru terlalu panjang (maks 100 karakter).", 422);
			case "CREDENTIAL_ACCOUNT_NOT_FOUND":
				return fail("Akun ini tidak memakai kata sandi. Hubungi HR.", 409);
			default:
				return fail(message || "Gagal mengubah kata sandi.", 400);
		}
	}
}
