/** Template + penomoran surat keluar: render variabel dan nomor formal murni. */

export const JENIS_SURAT: Array<{ kode: string; nama: string; butuhRef: boolean }> = [
  { kode: "MUT", nama: "Mutasi / Promosi", butuhRef: true },
  { kode: "PAK", nama: "Paklaring", butuhRef: true },
  { kode: "SP", nama: "Peringatan / PHK", butuhRef: true },
  { kode: "KET", nama: "Keterangan Kerja", butuhRef: false },
];

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function bulanRomawi(bulan: number): string {
  return ROMAWI[bulan - 1] ?? String(bulan);
}

/** Format formal: 001/MUT/X/2026. */
export function formatNomorSurat(seq: number, kodeJenis: string, tanggal: Date): string {
  return `${String(seq).padStart(3, "0")}/${kodeJenis}/${bulanRomawi(tanggal.getMonth() + 1)}/${tanggal.getFullYear()}`;
}

/** Ganti {{kunci}} dengan vars; placeholder tak dikenal dibiarkan apa adanya. */
export function renderSurat(badan: string, vars: Record<string, string>): string {
  return badan.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (cocok, kunci: string) =>
    vars[kunci] !== undefined ? vars[kunci] : cocok,
  );
}

/** Daftar placeholder {{..}} yang dipakai template. */
export function daftarPlaceholder(badan: string): string[] {
  const hasil = new Set<string>();
  for (const m of badan.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) hasil.add(m[1]);
  return [...hasil];
}
