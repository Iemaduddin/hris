/** Impor/ekspor CSV + kualitas data (P4-5). Parser & validasi murni (tanpa DB). */

export const EMPLOYEE_CSV_HEADERS = [
  "nomorKaryawan",
  "namaLengkap",
  "gender",
  "tanggalLahir",
  "nik",
  "npwp",
  "telepon",
  "email",
  "alamat",
  "statusPtkp",
  "tanggalMasuk",
  "bankNama",
  "bankNorek",
  "bankAtasNama",
  "status",
] as const;

export const HISTORY_CSV_HEADERS = [
  "nomorKaryawan",
  "namaPerusahaan",
  "posisi",
  "tanggalMulai",
  "tanggalSelesai",
  "gajiTerakhir",
  "alasanKeluar",
  "teleponReferensi",
] as const;

export const SAMPLE_EMPLOYEE_CSV =
  "nomorKaryawan,namaLengkap,gender,tanggalLahir,nik,npwp,telepon,email,alamat,statusPtkp,tanggalMasuk,bankNama,bankNorek,bankAtasNama,status\n,Contoh Budi,LAKI_LAKI,1990-05-10,3273011005900001,,081234567890,budi@contoh.id,Jl. Contoh No. 1,TK_0,2024-01-02,BCA,1234567890,CONTOH BUDI,AKTIF\n";

export const SAMPLE_HISTORY_CSV =
  "nomorKaryawan,namaPerusahaan,posisi,tanggalMulai,tanggalSelesai,gajiTerakhir,alasanKeluar,teleponReferensi\nXXX.2024.00001,PT Lama,Staff,2020-01-02,2023-12-31,5000000,Habis kontrak,021123456\n";

export const MAX_IMPORT_ROWS = 500;

export const GENDER_VALID = ["LAKI_LAKI", "PEREMPUAN"] as const;
export const PTKP_VALID = ["TK_0", "TK_1", "TK_2", "TK_3", "K_0", "K_1", "K_2", "K_3"] as const;
export const STATUS_VALID = ["AKTIF", "TIDAK_AKTIF", "PROBASI", "RESIGN", "DIHENTIKAN", "PENSIUN"] as const;

/** Pecah CSV sederhana: dukung kutip ("...,...", "".."" escape) + CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // Abaikan baris kosong total.
    if (!(row.length === 1 && row[0].trim() === "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\r") {
      // tangani CRLF sekaligus
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }
  pushRow();
  return rows;
}

export type ValidatedRow<T> = { rowNumber: number; data: T; errors: string[] };

/** Validasi bentuk per baris karyawan (tanpa cek DB). */
export function validateEmployeeShape(
  row: Record<string, string>,
  rowNumber: number,
): ValidatedRow<Record<string, string>> {
  const errors: string[] = [];
  const v = (k: string) => (row[k] ?? "").trim();
  if (!v("namaLengkap")) errors.push("namaLengkap wajib diisi");
  if (!(GENDER_VALID as readonly string[]).includes(v("gender"))) errors.push("gender harus LAKI_LAKI/PEREMPUAN");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v("tanggalMasuk")) || Number.isNaN(new Date(v("tanggalMasuk")).getTime())) {
    errors.push("tanggalMasuk format YYYY-MM-DD");
  }
  if (v("tanggalLahir") && (!/^\d{4}-\d{2}-\d{2}$/.test(v("tanggalLahir")) || Number.isNaN(new Date(v("tanggalLahir")).getTime()))) {
    errors.push("tanggalLahir format YYYY-MM-DD");
  }
  if (v("nik") && !/^\d{16}$/.test(v("nik"))) errors.push("nik harus 16 digit");
  if (v("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) errors.push("email tidak valid");
  if (v("statusPtkp") && !(PTKP_VALID as readonly string[]).includes(v("statusPtkp"))) {
    errors.push(`statusPtkp harus ${PTKP_VALID.join("/")}`);
  }
  if (v("status") && !(STATUS_VALID as readonly string[]).includes(v("status"))) {
    errors.push(`status harus ${STATUS_VALID.join("/")}`);
  }
  return { rowNumber, data: row, errors };
}

/** Validasi bentuk per baris riwayat (tanpa cek DB). */
export function validateHistoryShape(
  row: Record<string, string>,
  rowNumber: number,
): ValidatedRow<Record<string, string>> {
  const errors: string[] = [];
  const v = (k: string) => (row[k] ?? "").trim();
  if (!v("nomorKaryawan")) errors.push("nomorKaryawan wajib diisi");
  if (!v("namaPerusahaan")) errors.push("namaPerusahaan wajib diisi");
  for (const k of ["tanggalMulai", "tanggalSelesai"] as const) {
    if (v(k) && (!/^\d{4}-\d{2}-\d{2}$/.test(v(k)) || Number.isNaN(new Date(v(k)).getTime()))) {
      errors.push(`${k} format YYYY-MM-DD`);
    }
  }
  if (v("tanggalMulai") && v("tanggalSelesai") && v("tanggalSelesai") < v("tanggalMulai")) {
    errors.push("tanggalSelesai sebelum tanggalMulai");
  }
  if (v("gajiTerakhir") && (!/^\d+(\.\d+)?$/.test(v("gajiTerakhir")) || Number(v("gajiTerakhir")) < 0)) {
    errors.push("gajiTerakhir harus angka ≥ 0");
  }
  return { rowNumber, data: row, errors };
}

/** Bangun CSV dari header + matriks string (kutip otomatis bila perlu). */
export function buildCsv(header: readonly string[], rows: string[][]): string {
  const cell = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  return [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n") + "\n";
}
