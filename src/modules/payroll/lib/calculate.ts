import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { akumulasiKelompok } from "./kelompok";
import {
  KUNCI_PEMBAGI_ALPA,
  KUNCI_TELAT_MAX,
  KUNCI_TELAT_PER_MENIT,
  PAYROLL_SETTING_DEFAULT,
  hitungPotonganAlpa,
  hitungPotonganTelat,
  parseRupiahSetting,
  resolvePembagiAlpa,
} from "./potongan";
import { LEMBUR_SETTING_DEFAULT, KUNCI_LEMBUR_DIVISOR, KUNCI_LEMBUR_TIERED } from "./lembur";
import { KASBON_SETTING_DEFAULT } from "./kasbon";
import { hitungPotonganKasbon } from "./kasbon";
import { KUNCI_SKORSING_TANPA_UPAH } from "@/src/modules/employee/lib/disiplin";
import { hariSkorsingDalamPeriode } from "@/src/modules/employee/lib/disiplin";
import {
  hitungUpahLemburSehari,
  hitungUpahSejam,
  keteranganTier,
  ringkasTier,
  type KategoriLembur,
} from "./lembur";
import {
  TER_FALLBACK,
  hitungPPhDesemberKoreksi,
  hitungPPhTerBulanan,
  kategoriTerDariPtkp,
  type LapisTer,
  type StatusPtkpInput,
} from "./pph21-ter";

export type RincianItem = {
	kode: string;
	nama: string;
	kelompok: string;
	jumlah: number;
	keterangan: string;
};

export type HitungGaji = {
	gajiPokok: number;
	totalPendapatan: number;
	totalPotongan: number;
	gajiBersih: number;
	/** Premi ditanggung perusahaan (info slip, tak mengurangi bersih). */
	totalBiayaPerusahaan: number;
	/** Reimbursement periode ini (masuk bersih, di luar bruto PPh). */
	totalReimburse: number;
	hariHadir: number;
	hariAlpa: number;
	/** Menit rekap TERLAMBAT (toleransi shift dihormati). */
	totalTelatMenit: number;
	jamLembur: number;
	shiftMalam: number;
	rincian: RincianItem[];
	/** Rencana potongan kasbon periode ini (dibukukan salary run). */
	kasbonPotongan: Array<{
		kasbonId: string;
		nomor: string;
		jumlah: number;
		angsuranKe: number;
		sisaSesudah: number;
	}>;
	/** Klaim yang dibayar run ini (dibukukan salary run). */
	reimburseBayar: Array<{ claimId: string; nomor: string; jumlah: number }>;
};

/**
 * Aturan hitung gaji:
 * - Gapok: kontrak AKTIF terbaru. Hadir/alpa/lembur/shift dari rekap.
 * - NOMINAL tetap; PERSEN = % x min(gapok, batasAtas); PER_HARI x hariHadir;
 *   PER_JAM_LEMBUR x jam (legacy; UPAH_LEMBUR tiered bila LEMBUR_TIERED=1);
 *   PER_SHIFT_MALAM x shift malam.
 * - POTONGAN_ALPA: hari x gapok/pembagi (25/26/AKTUAL).
 * - POTONGAN_TELAT: menit TERLAMBAT x tarif (0 = mati), cap/bulan opsional.
 * - PPh 21 TER otomatis dari bruto (PP 58/2023); komponen manual POT_PPH21
 *   diabaikan. Desember: koreksi tahunan Pasal 17 (PMK 168/2023).
 * - PENDAPATAN/TUNJANGAN menambah; POTONGAN/IURAN mengurangi;
 *   BIAYA_PERUSAHAAN info slip saja.
 */

export type AkumulasiTahunanPPh = {
  /** Total bruto Jan–Nov tahun berjalan (tanpa bulan Des berjalan). */
  brutoJanNov: number;
  /** Total PPh TER Jan–Nov yang sudah dipotong. */
  pphJanNov: number;
  /** Total iuran pengurang (JHT+JP) Jan–Nov. */
  iuranJanNov: number;
  /** Reimburse Jan–Nov (di luar bruto). */
  reimburseJanNov: number;
  /** Jumlah bulan bekerja dalam tahun berjalan (1–12). */
  bulanKerja: number;
};

const cacheLapisTer = new Map<string, LapisTer[]>();

// Cache pengaturan 60 detik (diinvalidasi tiap save).
let cacheSettingAt = 0;
let cacheSettingMap: Record<string, string> = {};

/** Invalidasi cache pengaturan (dipanggil setiap save settings). */
export function resetCachePengaturan(): void {
  cacheSettingAt = 0;
  cacheSettingMap = {};
}

const HARI_JS_KE_ENUM = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;

/**
 * Kategori hari tiap tanggal lembur (tier Kepmen 102/2004).
 * LIBUR bila di HariLibur; ada roster = KERJA; selain itu ikut kalender
 * penugasan (fallback Sab/Ming = LIBUR_5).
 */
export async function getKategoriLemburMap(
  karyawanId: string,
  dates: Date[],
): Promise<Map<string, KategoriLembur>> {
  const hasil = new Map<string, KategoriLembur>();
  if (dates.length === 0) return hasil;
  const kunci = (d: Date) => d.toISOString().slice(0, 10);
  const unik = [...new Set(dates.map(kunci))].sort();
  const min = new Date(`${unik[0]}T00:00:00.000Z`);
  const maks = new Date(`${unik[unik.length - 1]}T23:59:59.999Z`);

  const [liburRows, rosterRows, penugasan] = await Promise.all([
    prisma.hariLibur.findMany({
      where: { tanggal: { gte: min, lte: maks } },
      select: { tanggal: true },
    }),
    prisma.rosterShift.findMany({
      where: { karyawanId, tanggal: { gte: min, lte: maks } },
      select: { tanggal: true },
    }),
    prisma.penugasanKalender.findMany({
      where: { karyawanId },
      orderBy: { tanggalMulai: "desc" },
      select: { kalenderKerjaId: true, tanggalMulai: true, tanggalSelesai: true },
    }),
  ]);
  const liburSet = new Set(liburRows.map((r) => kunci(r.tanggal)));
  const rosterSet = new Set(rosterRows.map((r) => kunci(r.tanggal)));

  const kalenderIds = [...new Set(penugasan.map((p) => p.kalenderKerjaId))];
  const jadwalMap = new Map<number, { hari: Record<string, boolean>; kerjaSeminggu: number }>();
  if (kalenderIds.length > 0) {
    const kalenders = await prisma.kalenderKerja.findMany({
      where: { id: { in: kalenderIds } },
      select: { id: true, jadwalKerja: { select: { hari: true, isHariKerja: true } } },
    });
    for (const k of kalenders) {
      const hari: Record<string, boolean> = {};
      for (const j of k.jadwalKerja) hari[j.hari] = j.isHariKerja;
      jadwalMap.set(k.id, { hari, kerjaSeminggu: k.jadwalKerja.filter((j) => j.isHariKerja).length });
    }
  }
  const kalenderUntuk = (tglKey: string): number | null => {
    const t = penugasan.find(
      (p) => p.tanggalMulai.toISOString().slice(0, 10) <= tglKey && (!p.tanggalSelesai || p.tanggalSelesai.toISOString().slice(0, 10) >= tglKey),
    );
    return t ? t.kalenderKerjaId : null;
  };

  for (const tglKey of unik) {
    const hariEnum = HARI_JS_KE_ENUM[new Date(`${tglKey}T12:00:00.000Z`).getUTCDay()];
    if (liburSet.has(tglKey)) {
      const kalId = kalenderUntuk(tglKey);
      const n = kalId ? (jadwalMap.get(kalId)?.kerjaSeminggu ?? 5) : 5;
      hasil.set(tglKey, n >= 6 ? "LIBUR_6" : "LIBUR_5");
    } else if (rosterSet.has(tglKey)) {
      hasil.set(tglKey, "KERJA");
    } else {
      const kalId = kalenderUntuk(tglKey);
      const info = kalId ? jadwalMap.get(kalId) : undefined;
      if (info && hariEnum in info.hari) {
        hasil.set(tglKey, info.hari[hariEnum] ? "KERJA" : info.kerjaSeminggu >= 6 ? "LIBUR_6" : "LIBUR_5");
      } else {
        const weekend = hariEnum === "SABTU" || hariEnum === "MINGGU";
        hasil.set(tglKey, weekend ? "LIBUR_5" : "KERJA");
      }
    }
  }
  return hasil;
}

export async function getPengaturanPayroll(): Promise<Record<string, string>> {
  if (Date.now() - cacheSettingAt < 60_000 && Object.keys(cacheSettingMap).length > 0) {
    return cacheSettingMap;
  }
  try {
    const rows = await prisma.payrollSetting.findMany({ select: { kunci: true, nilai: true } });
    cacheSettingMap = { ...PAYROLL_SETTING_DEFAULT, ...LEMBUR_SETTING_DEFAULT, ...KASBON_SETTING_DEFAULT };
    for (const r of rows) cacheSettingMap[r.kunci] = r.nilai;
  } catch {
    cacheSettingMap = { ...PAYROLL_SETTING_DEFAULT, ...LEMBUR_SETTING_DEFAULT, ...KASBON_SETTING_DEFAULT };
  }
  cacheSettingAt = Date.now();
  return cacheSettingMap;
}

export async function getLapisTer(kategori: "A" | "B" | "C"): Promise<LapisTer[]> {
  const cached = cacheLapisTer.get(kategori);
  if (cached) return cached;
  try {
    const rows = await prisma.pph21TerTarif.findMany({
      where: { kategori },
      orderBy: { urutan: "asc" },
      select: { batasAtas: true, tarif: true },
    });
    if (rows.length > 0) {
      const lapis: LapisTer[] = rows.map((r) => ({
        batasAtas: r.batasAtas ? Number(r.batasAtas) : null,
        tarif: Number(r.tarif),
      }));
      cacheLapisTer.set(kategori, lapis);
      return lapis;
    }
  } catch {
    // Tabel belum termigrasi (mis. test) → fallback kode.
  }
  return TER_FALLBACK[kategori];
}

export async function hitungGajiKaryawan(
  karyawanId: string,
  mulai: Date,
  selesai: Date,
  akumulasi?: AkumulasiTahunanPPh,
): Promise<HitungGaji> {
	const start = toDbDate(mulai);
	const end = toDbDate(selesai);

	const kontrak = await prisma.kontrakKerja.findFirst({
		where: { karyawanId, status: "AKTIF" },
		orderBy: { tanggalMulai: "desc" },
		select: { gajiPokok: true },
	});
	const gajiPokok = kontrak?.gajiPokok ? Number(kontrak.gajiPokok) : 0;

	const karyawan = await prisma.karyawan.findUnique({
		where: { id: karyawanId },
		select: { statusPtkp: true, npwp: true },
	});
	const ptkp = ((karyawan?.statusPtkp ?? "TK_0") as StatusPtkpInput) ?? "TK_0";

	const rekap = await prisma.rekapHarian.findMany({
		where: { karyawanId, tanggal: { gte: start, lte: end } },
		select: { status: true, telatMenit: true },
	});
	const HADIR_SET = new Set(["HADIR", "TERLAMBAT", "CUTI", "IZIN", "DINAS"]);
	let hariHadir = 0;
	let hariAlpa = 0;
	let totalTelatMenit = 0;
	for (const r of rekap) {
		if (r.status === "ALPA") hariAlpa++;
		else if (HADIR_SET.has(r.status)) hariHadir++;
		// Hanya status TERLAMBAT yang didenda (toleransi shift dihormati).
		if (r.status === "TERLAMBAT") totalTelatMenit += r.telatMenit ?? 0;
	}

	const lemburRows = await prisma.lembur.findMany({
		where: { karyawanId, tanggal: { gte: start, lte: end }, status: "DISETUJUI" },
		select: { tanggal: true, jumlahJam: true },
	});
	const jamLembur = lemburRows.reduce((acc, r) => acc + Number(r.jumlahJam), 0);

	const shiftMalam = await prisma.rosterShift.count({
		where: { karyawanId, tanggal: { gte: start, lte: end }, shift: { lintasHari: true } },
	});

	const assignments = await prisma.gajiKaryawan.findMany({
		where: { karyawanId, isActive: true, komponen: { isActive: true } },
		include: { komponen: true },
		orderBy: { komponen: { urutan: "asc" } },
	});

	// Aturan potongan global (pembagi alpa, tarif + cap telat).
	const pengaturan = await getPengaturanPayroll();
	const tglSelesai = new Date(selesai);
	const hariDalamBulan = new Date(Date.UTC(tglSelesai.getUTCFullYear(), tglSelesai.getUTCMonth() + 1, 0)).getUTCDate();
	const pembagiAlpa = resolvePembagiAlpa(pengaturan[KUNCI_PEMBAGI_ALPA], hariDalamBulan);
	const tarifTelat = parseRupiahSetting(pengaturan[KUNCI_TELAT_PER_MENIT]) ?? 0;
	const maxTelat = parseRupiahSetting(pengaturan[KUNCI_TELAT_MAX]);

	// Upah lembur tiered (regulasi) vs flat (legacy).
	const tieredOn = (pengaturan[KUNCI_LEMBUR_TIERED] ?? "1").trim() !== "0";
	const divisorRaw = Math.floor(Number(pengaturan[KUNCI_LEMBUR_DIVISOR] ?? 173));
	const divisorLembur = Number.isFinite(divisorRaw) && divisorRaw > 0 ? divisorRaw : 173;

	const rincian: RincianItem[] = [];
	let totalPendapatan = gajiPokok;
	let totalPotongan = 0;
	let totalBiayaPerusahaan = 0;

	// Upah sebulan = gapok + tunjangan tetap nominal.
	const tunjanganTetap = assignments
		.filter((a) => a.komponen.kelompok === "TUNJANGAN" && a.komponen.tipe === "NOMINAL")
		.reduce((acc, a) => acc + Number(a.komponen.nilai), 0);

	if (gajiPokok > 0) {
		rincian.push({ kode: "GAJI_POKOK", nama: "Gaji Pokok", kelompok: "PENDAPATAN", jumlah: gajiPokok, keterangan: "Dari kontrak aktif" });
	}

	for (const a of assignments) {
		const k = a.komponen;
		// PPh 21 otomatis via TER — komponen manual diabaikan anti-ganda.
		if (k.kode === "POT_PPH21" || k.kode === "POTONGAN_PPH21") continue;
		let jumlah = 0;
		let keterangan = "";
		if (k.kode === "POTONGAN_ALPA") {
			jumlah = hitungPotonganAlpa(gajiPokok, hariAlpa, pembagiAlpa);
			keterangan = `${hariAlpa} hari x GP/${pembagiAlpa}`;
		} else if (k.kode === "POTONGAN_TELAT") {
			const telat = hitungPotonganTelat(totalTelatMenit, tarifTelat, maxTelat);
			jumlah = telat.jumlah;
			keterangan = tarifTelat === 0
				? "Tarif belum diatur (nonaktif)"
				: `${totalTelatMenit} mnt x Rp${tarifTelat.toLocaleString("id-ID")}${telat.kenaCap ? ` (cap Rp${(maxTelat ?? 0).toLocaleString("id-ID")})` : ""}`;
		} else if (k.kode === "UPAH_LEMBUR" && tieredOn) {
			// Tiered Kepmen 102/2004 — nilai komponen diabaikan.
			const upahSebulan = gajiPokok + tunjanganTetap;
			const rate = hitungUpahSejam(upahSebulan, divisorLembur);
			const katMap = await getKategoriLemburMap(
				karyawanId,
				lemburRows.map((r) => r.tanggal),
			);
			const accTier = new Map<number, number>();
			let total = 0;
			for (const row of lemburRows) {
				const key = row.tanggal.toISOString().slice(0, 10);
				const hRow = hitungUpahLemburSehari(Number(row.jumlahJam), rate, katMap.get(key) ?? "KERJA");
				total += hRow.jumlah;
				ringkasTier(hRow.tiers, accTier);
			}
			jumlah = total;
			keterangan =
				lemburRows.length === 0 || upahSebulan <= 0
					? "Tidak ada lembur/upah disetujui"
					: `${Math.round(jamLembur * 100) / 100} jam (${keteranganTier(accTier)}) @Rp${Math.round(rate).toLocaleString("id-ID")}/jam`;
		} else if (k.tipe === "NOMINAL") {
			jumlah = Number(k.nilai);
		} else if (k.tipe === "PERSEN") {
			const basis = k.batasAtas ? Math.min(gajiPokok, Number(k.batasAtas)) : gajiPokok;
			jumlah = Math.round((basis * Number(k.nilai)) / 100);
			keterangan = `${k.nilai}% x ${basis}`;
		} else if (k.tipe === "PER_HARI") {
			jumlah = Math.round(Number(k.nilai) * hariHadir);
			keterangan = `${hariHadir} hari`;
		} else if (k.tipe === "PER_JAM_LEMBUR") {
			jumlah = Math.round(Number(k.nilai) * jamLembur);
			keterangan = `${jamLembur} jam`;
		} else if (k.tipe === "PER_SHIFT_MALAM") {
			jumlah = Math.round(Number(k.nilai) * shiftMalam);
			keterangan = `${shiftMalam} shift`;
		}

		rincian.push({ kode: k.kode, nama: k.nama, kelompok: k.kelompok, jumlah, keterangan });
		const acc = { pendapatan: totalPendapatan, potongan: totalPotongan, biayaPerusahaan: totalBiayaPerusahaan };
		akumulasiKelompok(k.kelompok, jumlah, acc);
		totalPendapatan = acc.pendapatan;
		totalPotongan = acc.potongan;
		totalBiayaPerusahaan = acc.biayaPerusahaan;
	}

	// Reimbursement disetujui yang belum dibayar: ikut gaji (TUNJANGAN),
	// tapi di luar bruto PPh (ganti rugi riil berkwiansi).
	const klaim = await prisma.expenseClaim.findMany({
		where: { karyawanId, status: "DISETUJUI", pembayaran: { none: {} } },
		orderBy: { createdAt: "asc" },
		select: { id: true, nomor: true, nominal: true },
	});
	let totalReimburse = 0;
	const reimburseBayar: HitungGaji["reimburseBayar"] = [];
	for (const c of klaim) {
		const jumlah = Math.max(0, Math.round(Number(c.nominal)));
		if (jumlah <= 0) continue;
		totalReimburse += jumlah;
		reimburseBayar.push({ claimId: c.id, nomor: c.nomor, jumlah });
	}
	if (totalReimburse > 0) {
		rincian.push({
			kode: "REIMBURSE",
			nama: `Reimbursement (${klaim.length} klaim)`,
			kelompok: "TUNJANGAN",
			jumlah: totalReimburse,
			keterangan: reimburseBayar.map((r) => r.nomor).join(", "),
		});
		totalPendapatan += totalReimburse;
	}

	// PPh 21 TER otomatis (PP 58/2023). Bruto = totalPendapatan tanpa reimburse.
	const bruto = Math.round(totalPendapatan) - totalReimburse;
	const kategori = kategoriTerDariPtkp(ptkp);
	const lapis = await getLapisTer(kategori);
	const bulanSelesai = new Date(selesai).getUTCMonth() + 1;
	let pph21 = 0;
	let ketPph = "";
	if (bulanSelesai === 12 && akumulasi) {
		const iuranBerjalan = rincian
			.filter((r) => r.kode === "BPJS_JHT" || r.kode === "BPJS_JP")
			.reduce((acc, r) => acc + r.jumlah, 0);
		const koreksi = hitungPPhDesemberKoreksi({
			ptkp,
			brutoSetahun: akumulasi.brutoJanNov + bruto - akumulasi.reimburseJanNov,
			iuranSetahun: akumulasi.iuranJanNov + iuranBerjalan,
			bulanKerja: akumulasi.bulanKerja,
			pphJanNov: akumulasi.pphJanNov,
			punyaNpwp: Boolean(karyawan?.npwp),
		});
		pph21 = koreksi.pphDesember;
		ketPph = `${koreksi.keterangan} (PKP ${koreksi.pkp.toLocaleString("id-ID")})`;
	} else {
		const hasil = hitungPPhTerBulanan(bruto, ptkp, lapis);
		pph21 = hasil.pph;
		ketPph = hasil.keterangan;
	}
	if (pph21 > 0 || bruto > 0) {
		rincian.push({ kode: "POT_PPH21", nama: "PPh 21 TER", kelompok: "POTONGAN", jumlah: pph21, keterangan: ketPph });
		totalPotongan += pph21;
	}

		// Skorsing tanpa upah (pengaturan): dipotong seperti alpa.
	if ((pengaturan[KUNCI_SKORSING_TANPA_UPAH] ?? "0").trim() === "1" && gajiPokok > 0) {
		const skorsing = await prisma.suratPeringatan.findMany({
			where: { karyawanId, tingkat: "SKORSING", status: "DITERBITKAN" },
			select: { tanggalSkorsingMulai: true, tanggalSkorsingSelesai: true },
		});
		let hariSkorsing = 0;
		for (const s of skorsing) {
			hariSkorsing += hariSkorsingDalamPeriode(s.tanggalSkorsingMulai, s.tanggalSkorsingSelesai, start, end);
		}
		if (hariSkorsing > 0) {
			const jumlah = Math.round((hariSkorsing * gajiPokok) / pembagiAlpa);
			rincian.push({
				kode: "POTONGAN_SKORSING",
				nama: "Potongan Skorsing",
				kelompok: "POTONGAN",
				jumlah,
				keterangan: `${hariSkorsing} hari x GP/${pembagiAlpa}`,
			});
			totalPotongan += jumlah;
		}
	}

	// Angsuran kasbon otomatis (read-only; pembukuan di salary run).
	const kasbonAktif = await prisma.kasbon.findMany({
		where: {
			karyawanId,
			status: "DISETUJUI",
			sisaHutang: { gt: 0 },
			mulaiPotong: { lte: end },
		},
		orderBy: [{ mulaiPotong: "asc" }, { createdAt: "asc" }],
		select: { id: true, nomor: true, sisaHutang: true, angsuranPerBulan: true, _count: { select: { angsuran: true } } },
	});
	const kasbonPotongan: HitungGaji["kasbonPotongan"] = [];
	for (const kb of kasbonAktif) {
		const jumlah = hitungPotonganKasbon(Number(kb.sisaHutang), Number(kb.angsuranPerBulan));
		if (jumlah <= 0) continue;
		const sisaSesudah = Math.max(0, Math.round(Number(kb.sisaHutang)) - jumlah);
		kasbonPotongan.push({
			kasbonId: kb.id,
			nomor: kb.nomor,
			jumlah,
			angsuranKe: kb._count.angsuran + 1,
			sisaSesudah,
		});
		rincian.push({
			kode: "POT_KASBON",
			nama: `Angsuran Kasbon ${kb.nomor}`,
			kelompok: "POTONGAN",
			jumlah,
			keterangan: `Angsuran ke-${kb._count.angsuran + 1} (sisa Rp${sisaSesudah.toLocaleString("id-ID")})`,
		});
		totalPotongan += jumlah;
	}

	return {
		gajiPokok,
		totalPendapatan,
		totalPotongan,
		gajiBersih: totalPendapatan - totalPotongan,
		totalBiayaPerusahaan,
		totalReimburse,
		hariHadir,
		hariAlpa,
		totalTelatMenit,
		jamLembur,
		shiftMalam,
		rincian,
		kasbonPotongan,
		reimburseBayar,
	};
}
