/**
 * Konversi kanonis untuk kolom TIME PostgreSQL (Prisma `DateTime @db.Time()`).
 *
 * Konvensi: string "HH:MM" (input form/seed) <-> Date epoch lokal.
 * Asumsi: zona waktu Node sama dengan sesi DB (deploy lokal). Semua baca/tulis
 * memakai helper ini agar round-trip konsisten — jangan kirim string "HH:MM"
 * langsung ke Prisma (ditolak) dan jangan rakit Date manual di tempat lain.
 */

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function toTimeValue(value: string | null | undefined): Date | null {
	if (!value) return null;
	const match = TIME_RE.exec(value.trim());
	if (!match) return null;
	const h = Number(match[1]);
	const m = Number(match[2]);
	const s = Number(match[3] ?? 0);
	if (h > 23 || m > 59 || s > 59) return null;
	return new Date(1970, 0, 1, h, m, s);
}

export function fromTimeValue(value: Date | null | undefined): string {
	if (!value) return "";
	const d = value instanceof Date ? value : new Date(value);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeToMinutes(value: Date | null | undefined): number | null {
	if (!value) return null;
	const d = value instanceof Date ? value : new Date(value);
	return d.getHours() * 60 + d.getMinutes();
}

export function minutesToTimeLabel(totalMinutes: number): string {
	const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(Math.floor(norm / 60))}:${pad(norm % 60)}`;
}

export function dateOnlyInput(value: Date | null | undefined): string {
	if (!value) return "";
	const d = value instanceof Date ? value : new Date(value);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(value: Date): Date {
	const d = new Date(value);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function addDays(value: Date, days: number): Date {
	const d = new Date(value);
	d.setUTCDate(d.getUTCDate() + days);
	return d;
}

/**
 * Kanonis untuk kolom DATE PostgreSQL (`@db.Date`).
 * Selalu UTC-midnight agar perbandingan kesetaraan konsisten
 * terlepas dari zona waktu server. Tulis & baca kolom DATE
 * wajib lewat helper ini — jangan pakai startOfDay/new Date mentah.
 */
export function toDbDate(value: Date | string): Date {
	if (typeof value === "string") {
		const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
		if (match) {
			return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
		}
	}
	const d = new Date(value);
	return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;

export function dayName(date: Date): (typeof HARI_MAP)[number] {
	return HARI_MAP[date.getDay()];
}
