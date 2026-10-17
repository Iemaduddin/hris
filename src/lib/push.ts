import prisma from "@/src/lib/prisma";

/**
 * Push via Expo Push Service. Best-effort: gagal kirim tak menggagalkan
 * alur bisnis — error ditangkap dan dicatat, tak dilempar ke pemanggil.
 */

export type PushMessage = {
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
export async function sendPush(messages: PushMessage[]): Promise<void> {
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

    // Token kedaluwarsa (DeviceNotRegistered) → berhenti mengirim ke sana.
    const expired = tickets
      .map((ticket, index) =>
        ticket?.details?.error === "DeviceNotRegistered" ? messages[index]?.to : null,
      )
      .filter((token): token is string => Boolean(token));

    if (expired.length > 0) {
      await prisma.perangkatKaryawan.updateMany({
        where: { pushToken: { in: expired } },
        data: { pushToken: null },
      });
    }

    const failedTicket = tickets.find((ticket) => ticket?.status === "error");
    if (failedTicket) {
      console.warn(`[push] Ditolak Expo: ${failedTicket.message ?? "tanpa pesan"}`);
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
