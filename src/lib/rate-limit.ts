/**
 * Pembatas laju sederhana (fixed window, per proses) untuk endpoint yang tidak
 * melewati handler HTTP better-auth — mis. `/api/v1/auth/login` yang memanggil
 * `auth.api.signInEmail` langsung sehingga rate-limit bawaan better-auth dilewati.
 *
 * Cukup untuk satu instance aplikasi (pola deploy proyek ini). Bila kelak
 * dijalankan multi-instance, ganti penyimpanannya (mis. tabel/Redis) tanpa
 * mengubah pemanggil.
 */

const MAX_ENTRIES = 5000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Catat satu percobaan untuk `key`; tolak bila melewati `max` dalam `windowSeconds`. */
export function hitRateLimit(key: string, max: number, windowSeconds: number): RateLimitResult {
	const now = Date.now();
	if (buckets.size > MAX_ENTRIES) {
		for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k);
	}
	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
		return { ok: true };
	}
	bucket.count += 1;
	if (bucket.count > max) {
		return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
	}
	return { ok: true };
}

/** Kosongkan hitungan setelah aksi berhasil (mis. login sukses) agar user sah tidak terkunci. */
export function clearRateLimit(key: string): void {
	buckets.delete(key);
}

/** Kunci pembatas: scope + IP klien + identitas (bila ada). */
export function rateLimitKey(request: Request, scope: string, identifier = ""): string {
	const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "lokal";
	return `${scope}:${ip}:${identifier.toLowerCase()}`;
}
