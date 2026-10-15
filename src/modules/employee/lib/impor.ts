/** Impor/ekspor CSV + kualitas data (P4-5). Parser & validasi murni (tanpa DB). */

export const HEADER_KARYAWAN = [
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

export const HEADER_RIWAYAT = [
	"nomorKaryawan",
	"namaPerusahaan",
	"posisi",
	"tanggalMulai",
	"tanggalSelesai",
	"gajiTerakhir",
	"alasanKeluar",
	"teleponReferensi",
] as const;

export const CONTOH_KARYAWAN =
	"nomorKaryawan,namaLengkap,gender,tanggalLahir,nik,npwp,telepon,email,alamat,statusPtkp,tanggalMasuk,bankNama,bankNorek,bankAtasNama,status\n,Contoh Budi,LAKI_LAKI,1990-05-10,3273011005900001,,081234567890,budi@contoh.id,Jl. Contoh No. 1,TK_0,2024-01-02,BCA,1234567890,CONTOH BUDI,AKTIF\n";

export const CONTOH_RIWAYAT =
	"nomorKaryawan,namaPerusahaan,posisi,tanggalMulai,tanggalSelesai,gajiTerakhir,alasanKeluar,teleponReferensi\nXXX.2024.00001,PT Lama,Staff,2020-01-02,2023-12-31,5000000,Habis kontrak,021123456\n";

export const MAKS_BARIS_IMPOR = 500;

export const GENDER_VALID = ["LAKI_LAKI", "PEREMPUAN"] as const;
export const PTKP_VALID = ["TK_0", "TK_1", "TK_2", "TK_3", "K_0", "K_1", "K_2", "K_3"] as const;
export const STATUS_VALID = ["AKTIF", "TIDAK_AKTIF", "PROBASI", "RESIGN", "DIHENTIKAN", "PENSIUN"] as const;

/** Pecah CSV sederhana: dukung kutip ("...,...", "".."" escape) + CRLF. */
export function parseCsv(teks: string): string[][] {
	const baris: string[][] = [];
	let field = "";
	let row: string[] = [];
	let dalamKutip = false;
	const pushField = () => {
		row.push(field);
		field = "";
	};
	const pushRow = () => {
		pushField();
		// Abaikan baris kosong total.
		if (!(row.length === 1 && row[0].trim() === "")) baris.push(row);
		row = [];
	};
	for (let i = 0; i < teks.length; i++) {
		const c = teks[i];
		if (dalamKutip) {
			if (c === '"') {
				if (teks[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					dalamKutip = false;
				}
			} else {
				field += c;
			}
		} else if (c === '"') {
			dalamKutip = true;
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
	return baris;
}

export type BarisValidasi<T> = { noBaris: number; data: T; galat: string[] };

/** Validasi bentuk per baris karyawan (tanpa cek DB). */
export function validasiBentukKaryawan(
	baris: Record<string, string>,
	noBaris: number,
): BarisValidasi<Record<string, string>> {
	const galat: string[] = [];
	const v = (k: string) => (baris[k] ?? "").trim();
	if (!v("namaLengkap")) galat.push("namaLengkap wajib diisi");
	if (!(GENDER_VALID as readonly string[]).includes(v("gender"))) galat.push("gender harus LAKI_LAKI/PEREMPUAN");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(v("tanggalMasuk")) || Number.isNaN(new Date(v("tanggalMasuk")).getTime())) {
		galat.push("tanggalMasuk format YYYY-MM-DD");
	}
	if (v("tanggalLahir") && (!/^\d{4}-\d{2}-\d{2}$/.test(v("tanggalLahir")) || Number.isNaN(new Date(v("tanggalLahir")).getTime()))) {
		galat.push("tanggalLahir format YYYY-MM-DD");
	}
	if (v("nik") && !/^\d{16}$/.test(v("nik"))) galat.push("nik harus 16 digit");
	if (v("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) galat.push("email tidak valid");
	if (v("statusPtkp") && !(PTKP_VALID as readonly string[]).includes(v("statusPtkp"))) {
		galat.push(`statusPtkp harus ${PTKP_VALID.join("/")}`);
	}
	if (v("status") && !(STATUS_VALID as readonly string[]).includes(v("status"))) {
		galat.push(`status harus ${STATUS_VALID.join("/")}`);
	}
	return { noBaris, data: baris, galat };
}

/** Validasi bentuk per baris riwayat (tanpa cek DB). */
export function validasiBentukRiwayat(
	baris: Record<string, string>,
	noBaris: number,
): BarisValidasi<Record<string, string>> {
	const galat: string[] = [];
	const v = (k: string) => (baris[k] ?? "").trim();
	if (!v("nomorKaryawan")) galat.push("nomorKaryawan wajib diisi");
	if (!v("namaPerusahaan")) galat.push("namaPerusahaan wajib diisi");
	for (const k of ["tanggalMulai", "tanggalSelesai"] as const) {
		if (v(k) && (!/^\d{4}-\d{2}-\d{2}$/.test(v(k)) || Number.isNaN(new Date(v(k)).getTime()))) {
			galat.push(`${k} format YYYY-MM-DD`);
		}
	}
	if (v("tanggalMulai") && v("tanggalSelesai") && v("tanggalSelesai") < v("tanggalMulai")) {
		galat.push("tanggalSelesai sebelum tanggalMulai");
	}
	if (v("gajiTerakhir") && (!/^\d+(\.\d+)?$/.test(v("gajiTerakhir")) || Number(v("gajiTerakhir")) < 0)) {
		galat.push("gajiTerakhir harus angka ≥ 0");
	}
	return { noBaris, data: baris, galat };
}

/** Bangun CSV dari header + matriks string (kutip otomatis bila perlu). */
export function buildCsv(header: readonly string[], rows: string[][]): string {
	const sel = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
	return [header.map(sel).join(","), ...rows.map((r) => r.map(sel).join(","))].join("\n") + "\n";
}
