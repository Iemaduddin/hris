/** Masking konsisten web + mobile (P0-9). NIK/NPWP/rekening tidak pernah tampil penuh di UI. */

/** Samakan dengan mask di API mobile: 4 depan + •••••• + 4 belakang. */
export function maskNilai(value: string | null | undefined): string | null {
	const raw = (value ?? "").trim();
	if (!raw) return null;
	if (raw.length <= 4) return "••••";
	const ekor = raw.slice(-4);
	const kepala = raw.slice(0, 4);
	return `${kepala}••••••${ekor}`;
}

/** Rekening bank: hanya 4 digit terakhir yang tampil. */
export function maskRekening(value: string | null | undefined): string | null {
	const raw = (value ?? "").replaceAll(" ", "").replaceAll("-", "").trim();
	if (!raw) return null;
	if (raw.length <= 4) return "••••";
	return `••••••${raw.slice(-4)}`;
}
