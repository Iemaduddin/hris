import prisma from "@/src/lib/prisma";

/**
 * Pengirim push notification via Expo Push Service (PRD mobile Bag. 5.8 / B8).
 * Endpoint resmi: POST https://exp.host/--/api/v2/push/send
 *
 * Sifatnya pelengkap: kegagalan push TIDAK boleh menjatuhkan alur bisnis —
 * semua error ditangkap dan dicatat, tidak pernah dilempar ke pemanggil.
 */

export type PesanPush = {
	to: string;
	title: string;
	body: string;
	data?: Record<string, unknown>;
	sound?: "default";
	priority?: "default" | "normal" | "high";
};

const PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const TIMEOUT_MS = 10_000;

type PushTicket = {
	status: "ok" | "error";
	id?: string;
	message?: string;
	details?: { error?: string };
};

type PushResponse = { data?: PushTicket | PushTicket[]; errors?: { message?: string }[] };

/** Kirim satu batch pesan (maks. 100 per request sesuai batas Expo). */
export async function kirimPush(messages: PesanPush[]): Promise<void> {
	if (messages.length === 0) return;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const response = await fetch(PUSH_ENDPOINT, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(messages.slice(0, 100)),
			signal: controller.signal,
		});

		if (!response.ok) {
			console.warn(`[push] Expo Push Service menolak request (HTTP ${response.status}).`);
			return;
		}

		const payload = (await response.json()) as PushResponse;
		const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];

		// Token yang sudah tidak terdaftar (app di-uninstall / izin dicabut) →
		// berhenti mengirim ke sana (saran resmi Expo: stop sending).
		const kedaluwarsa = tickets
			.map((ticket, index) =>
				ticket?.details?.error === "DeviceNotRegistered" ? messages[index]?.to : null,
			)
			.filter((token): token is string => Boolean(token));

		if (kedaluwarsa.length > 0) {
			await prisma.perangkatKaryawan.updateMany({
				where: { pushToken: { in: kedaluwarsa } },
				data: { pushToken: null },
			});
		}

		const galatTicket = tickets.find((ticket) => ticket?.status === "error");
		if (galatTicket) {
			console.warn(`[push] Ditolak Expo: ${galatTicket.message ?? "tanpa pesan"}`);
		}
	} catch (error) {
		console.warn(
			"[push] Gagal menghubungi Expo Push Service:",
			error instanceof Error ? error.message : error,
		);
	} finally {
		clearTimeout(timer);
	}
}
