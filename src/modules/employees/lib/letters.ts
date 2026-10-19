/** Template + penomoran surat keluar: render variabel dan nomor formal murni. */

export const LETTER_TYPES: Array<{ code: string; name: string; needsRef: boolean }> = [
  { code: "MUT", name: "Mutasi / Promosi", needsRef: true },
  { code: "PAK", name: "Paklaring", needsRef: true },
  { code: "SP", name: "Peringatan / PHK", needsRef: true },
  { code: "KET", name: "Keterangan Kerja", needsRef: false },
];

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function romanMonth(month: number): string {
  return ROMAN_NUMERALS[month - 1] ?? String(month);
}

/** Format formal: 001/MUT/X/2026. */
export function formatLetterNumber(seq: number, letterCode: string, date: Date): string {
  return `${String(seq).padStart(3, "0")}/${letterCode}/${romanMonth(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Ganti {{kunci}} dengan vars; placeholder tak dikenal dibiarkan apa adanya. */
export function renderLetter(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) =>
    vars[key] !== undefined ? vars[key] : match,
  );
}

/** Daftar placeholder {{..}} yang dipakai template. */
export function listPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) found.add(m[1]);
  return [...found];
}
