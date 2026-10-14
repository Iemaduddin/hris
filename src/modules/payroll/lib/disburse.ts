/**
 * Disbursement bank (murni, teruji). CSV titik-koma untuk upload bulk
 * transfer: NO;BANK;NOREK;ATAS_NAMA;NOMINAL;BERITA.
 */

export type BarisDisburse = {
  bank: string;
  norek: string;
  atasNama: string;
  nominal: number;
  berita: string;
};

function selCsv(value: string): string {
  if (/[;"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildDisburseCsv(baris: BarisDisburse[]): string {
  const head = "NO;BANK;NOREK;ATAS_NAMA;NOMINAL;BERITA";
  const lines = baris.map((b, i) =>
    [
      String(i + 1),
      selCsv(b.bank.trim()),
      selCsv(b.norek.trim()),
      selCsv(b.atasNama.trim()),
      String(Math.max(0, Math.round(b.nominal))),
      selCsv(b.berita.trim()),
    ].join(";"),
  );
  return [head, ...lines].join("\n");
}

export type KandidatDisburse = {
  nama: string;
  bank: string | null;
  norek: string | null;
  atasNama: string | null;
  nominal: number;
};

/** Pisahkan yang siap transfer vs yang data banknya belum lengkap. */
export function bagiDisburse(
  kandidat: KandidatDisburse[],
  berita: string,
): { baris: BarisDisburse[]; belumLengkap: string[]; total: number } {
  const baris: BarisDisburse[] = [];
  const belumLengkap: string[] = [];
  let total = 0;
  for (const k of kandidat) {
    if (!k.bank?.trim() || !k.norek?.trim() || !k.atasNama?.trim()) {
      belumLengkap.push(k.nama);
      continue;
    }
    if (k.nominal <= 0) continue;
    baris.push({ bank: k.bank, norek: k.norek, atasNama: k.atasNama, nominal: k.nominal, berita });
    total += Math.round(k.nominal);
  }
  return { baris, belumLengkap, total };
}
