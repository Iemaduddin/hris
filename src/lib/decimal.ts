/**
 * Konversi nilai Decimal Prisma menjadi `number` JS.
 * Prisma mengembalikan `Decimal` untuk kolom `Decimal`, yang tidak
 * langsung cocok dengan util berbasis `number`.
 */
export function decimalKeNumber(value: unknown): number | null {
	if (value == null) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
