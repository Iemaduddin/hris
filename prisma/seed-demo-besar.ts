import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Dataset demo besar (~300 karyawan) untuk Requirement & UAT tiap fitur.
 * Idempoten: tiap seksi dilewati bila datanya sudah ada — aman dijalankan ulang.
 * Angka acak deterministik (mulberry32) agar hasil stabil antar run.
 *
 * Isi: karyawan + user (3 nama titipan), kontrak, saldo cuti, roster,
 * rekap Sep–Okt 2026, cuti/lembur disetujui, absensi riil, kasbon,
 * reimbursement, salary run Sep+Okt DITERBITKAN, THR Idul Adha DITERBITKAN.
 */

const TARGET_TOTAL = 300;
const SEED = 20261014;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const int = (min: number, maks: number) => min + Math.floor(rnd() * (maks - min + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);

const NAMA_DEPAN = [
  "Ahmad", "Budi", "Citra", "Dewi", "Eko", "Fitri", "Gilang", "Hesti", "Irfan", "Joko",
  "Kartika", "Lukman", "Maya", "Nanda", "Oscar", "Putri", "Rudi", "Sari", "Tono", "Utami",
  "Vina", "Wahyu", "Yoga", "Yuni", "Agus", "Rina", "Dedi", "Nina", "Fajar", "Lina",
  "Hendra", " Ratna", "Doni", "Sinta", "Andi", "Mega", "Rizky", "Wulan", "Bagus", "Intan",
];
const NAMA_BELAKANG = [
  "Saputra", "Wijaya", "Kusuma", "Pratama", "Nugroho", "Santoso", "Setiawan", "Hidayat",
  "Rahmawati", "Anggraini", "Putra", "Sari", "Nugraha", "Firmansyah", "Utomo", "Lestari",
  "Gunawan", "Halim", "Siregar", "Nasution", "Pangestu", "Wibowo", "Kurniawan", "Maharani",
];
const PTKP = ["TK_0", "TK_1", "TK_2", "TK_3", "K_0", "K_1", "K_2", "K_3"] as const;
const BANK = ["BCA", "BRI", "MANDIRI", "BNI", "BSI", "CIMB"];

const KHUSUS = [
  { nama: "Iemaduddin", gender: "LAKI_LAKI" as const, email: "iemaduddin@example.com", password: "Iemaduddin123!" },
  { nama: "Didin", gender: "LAKI_LAKI" as const, email: "didin@example.com", password: "Didin123!" },
  { nama: "Izzah Nabila", gender: "PEREMPUAN" as const, email: "izzah@example.com", password: "Izzah123!" },
];

const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, autoSignIn: false },
});

async function pastikanUser(name: string, email: string, password: string, role: "EMPLOYEE" | "MANAJER" = "EMPLOYEE") {
  let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    await auth.api.signUpEmail({ body: { name, email, password } });
    await prisma.user.update({ where: { email }, data: { role } });
    user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  }
  return user!.id;
}

async function main() {
  // ---------- 0. Master ----------
  const units = await prisma.unitOrganisasi.findMany({ select: { id: true } });
  const positions = await prisma.posisi.findMany({ select: { id: true } });
  const locations = await prisma.lokasiKerja.findMany({ where: { isActive: true }, select: { id: true, kode: true } });
  const kalender = (await prisma.kalenderKerja.findFirst({ where: { isDefault: true }, select: { id: true } }))
    ?? (await prisma.kalenderKerja.findFirst({ select: { id: true } }));
  const cutiTahunan = await prisma.jenisKetidakhadiran.findFirst({ where: { kode: "CUTI_TAHUNAN" }, select: { id: true } });
  if (units.length === 0 || positions.length === 0 || locations.length === 0 || !kalender || !cutiTahunan) {
    throw new Error("Master belum lengkap — jalankan seed:all dulu.");
  }
  for (const s of [
    { kode: "PAGI", nama: "Shift Pagi", masuk: "07:00", keluar: "15:00", lintas: false },
    { kode: "SIANG", nama: "Shift Siang", masuk: "15:00", keluar: "23:00", lintas: false },
    { kode: "MALAM", nama: "Shift Malam", masuk: "23:00", keluar: "07:00", lintas: true },
  ]) {
    await prisma.shift.upsert({
      where: { kode: s.kode },
      create: {
        kode: s.kode, nama: s.nama,
        jamMasuk: new Date(`1970-01-01T${s.masuk}:00`), jamKeluar: new Date(`1970-01-01T${s.keluar}:00`),
        lintasHari: s.lintas, toleransiTelatMenit: 15,
      },
      update: {},
    });
  }
  const shifts = await prisma.shift.findMany({ where: { kode: { in: ["PAGI", "SIANG", "MALAM"] } }, select: { id: true, kode: true } });
  console.log(`master ok: unit=${units.length} posisi=${positions.length} lokasi=${locations.length}`);

  // ---------- 1. Karyawan ----------
  const ada = await prisma.karyawan.count();
  const butuh = Math.max(0, TARGET_TOTAL - ada);
  const nikPakai = new Set((await prisma.karyawan.findMany({ select: { nik: true } })).map((k) => k.nik));
  const buatNik = () => {
    let nik = "";
    do {
      nik = `3273${String(int(0, 999999999999)).padStart(12, "0")}`;
    } while (nikPakai.has(nik));
    nikPakai.add(nik);
    return nik;
  };
  let seq = (await prisma.karyawan.count({ where: { nomorKaryawan: { startsWith: "DMO.2026." } } })) + 1;
  const nomorBaru = () => `DMO.2026.${String(seq++).padStart(5, "0")}`;

  const sinta = await prisma.karyawan.findUnique({ where: { nomorKaryawan: "DEMO-2026-001" }, select: { id: true } });
  const idsBaru: string[] = [];

  // 1a. Tiga nama titipan (EMPLOYEE + akun login)
  let khususBaru = 0;
  for (const k of KHUSUS) {
    const userId = await pastikanUser(k.nama, k.email, k.password);
    const tglMasuk = utc(2025, int(1, 12), int(1, 28));
    const nomor = `DMO.2026.${k.nama.split(" ")[0].toUpperCase()}`;
    let row = await prisma.karyawan.findUnique({ where: { nomorKaryawan: nomor }, select: { id: true } });
    if (!row) {
      row = await prisma.karyawan.create({
        data: {
          nomorKaryawan: nomor,
          namaLengkap: k.nama, gender: k.gender, status: "AKTIF", nik: buatNik(),
          telepon: `0812${String(int(10000000, 99999999))}`, email: k.email,
          tanggalMasuk: tglMasuk, userId, atasanLangsungId: sinta?.id ?? null,
          statusPtkp: pick([...PTKP]) as never,
          bankNama: pick(BANK), bankNorek: String(int(1000000000, 1999999999)), bankAtasNama: k.nama.toUpperCase(),
        },
        select: { id: true },
      });
      khususBaru++;
    } else {
      await prisma.karyawan.update({ where: { id: row.id }, data: { userId } });
    }
    idsBaru.push(row.id);
  }

  // 1b. Acak hingga total 300
  let acakBaru = 0;
  for (let i = 0; i < butuh - KHUSUS.length; i++) {
    const gender = rnd() < 0.5 ? ("LAKI_LAKI" as const) : ("PEREMPUAN" as const);
    const nama = `${pick(NAMA_DEPAN).trim()} ${pick(NAMA_BELAKANG)}`;
    const roll = rnd();
    const status = roll < 0.88 ? ("AKTIF" as const) : roll < 0.95 ? ("PROBASI" as const) : ("RESIGN" as const);
    const tahunMasuk = status === "PROBASI" ? 2026 : int(2020, 2026);
    const tglMasuk = utc(tahunMasuk, int(1, 12), int(1, 28));
    const row = await prisma.karyawan.create({
      data: {
        nomorKaryawan: nomorBaru(),
        namaLengkap: nama, gender, status, nik: buatNik(),
        telepon: `0812${String(int(10000000, 99999999))}`,
        tanggalMasuk: tglMasuk,
        tanggalResign: status === "RESIGN" ? utc(2026, int(1, 9), int(1, 28)) : null,
        statusPtkp: pick([...PTKP]) as never,
        bankNama: pick(BANK), bankNorek: String(int(1000000000, 1999999999)), bankAtasNama: nama.toUpperCase(),
      },
      select: { id: true },
    });
    idsBaru.push(row.id);
    acakBaru++;
  }
  console.log(`karyawan: +${khususBaru + acakBaru} baru, total ${await prisma.karyawan.count()}`);

  // 1c. Atasan: Sinta + 8 senior untuk sebaran tim (urutan tetap agar stabil)
  const semuaAktif = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    orderBy: { nomorKaryawan: "asc" },
    select: { id: true, nomorKaryawan: true, atasanLangsungId: true },
  });
  const poolAtasan = [sinta?.id, ...semuaAktif.filter((k) => k.nomorKaryawan.startsWith("DMO.")).slice(0, 8).map((k) => k.id)]
    .filter((x): x is string => Boolean(x));
  for (const k of semuaAktif) {
    if (k.atasanLangsungId) continue;
    const calon = poolAtasan.filter((a) => a !== k.id);
    if (calon.length === 0) continue;
    await prisma.karyawan.update({ where: { id: k.id }, data: { atasanLangsungId: pick(calon) } });
  }
  console.log("atasan: OK");

  // ---------- 2. Penempatan + kontrak + saldo ----------
  const aktifSemua = await prisma.karyawan.findMany({
    where: { status: { in: ["AKTIF", "PROBASI"] } },
    select: { id: true, tanggalMasuk: true, status: true },
  });
  for (const k of aktifSemua) {
    const adaTugas = await prisma.posisiKaryawan.findFirst({ where: { karyawanId: k.id, isCurrent: true }, select: { id: true } });
    if (!adaTugas) {
      await prisma.posisiKaryawan.create({
        data: {
          karyawanId: k.id, unitOrganisasiId: pick(units).id, posisiId: pick(positions).id,
          lokasiKerjaId: pick(locations).id, isPrimary: true, isCurrent: true, tanggalEfektif: k.tanggalMasuk,
        },
      });
    }
    const adaKontrak = await prisma.kontrakKerja.findFirst({ where: { karyawanId: k.id }, select: { id: true } });
    if (!adaKontrak) {
      const gapok = Math.round(int(90, 500) * 50000 / 100000) * 100000; // 4,5–25 jt
      await prisma.kontrakKerja.create({
        data: {
          karyawanId: k.id, nomorKontrak: `KTR-DMO3-${k.id.slice(-6).toUpperCase()}`,
          jenisKontrak: k.status === "PROBASI" ? "PKWT" : pick(["PKWTT", "PKWTT", "PKWT"] as const),
          tanggalMulai: k.tanggalMasuk,
          tanggalSelesai: k.status === "PROBASI" ? utc(2026, 12, 31) : null,
          status: "AKTIF", gajiPokok: gapok,
        },
      });
    }
    await prisma.saldoCuti.upsert({
      where: { karyawanId_jenisKetidakhadiranId_tahun: { karyawanId: k.id, jenisKetidakhadiranId: cutiTahunan.id, tahun: 2026 } },
      create: { karyawanId: k.id, jenisKetidakhadiranId: cutiTahunan.id, tahun: 2026, saldoAwal: 12, saldoAkhir: 12 },
      update: {},
    });
  }
  console.log(`penempatan+kontrak+saldo: ${aktifSemua.length} karyawan`);

  // ---------- 3. Roster Okt–Nov (subset shift) ----------
  const shiftIds = shifts.map((s) => s.id);
  const kandidatShift = aktifSemua.filter((_, i) => i % 5 === 0);
  const tgls: Date[] = [];
  for (let d = new Date(Date.UTC(2026, 9, 1)); d <= new Date(Date.UTC(2026, 10, 30)); d = new Date(d.getTime() + 86_400_000)) {
    tgls.push(new Date(d));
  }
  const barisRoster: Array<{ karyawanId: string; tanggal: Date; shiftId: string }> = [];
  kandidatShift.forEach((k, i) => {
    tgls.forEach((t, j) => {
      const gilir = (j + i) % 4;
      if (gilir === 3) return; // libur
      barisRoster.push({ karyawanId: k.id, tanggal: t, shiftId: shiftIds[gilir] });
    });
  });
  let rosterBaru = 0;
  for (let i = 0; i < barisRoster.length; i += 500) {
    const potong = barisRoster.slice(i, i + 500);
    const sudah = await prisma.rosterShift.findMany({
      where: { OR: potong.map((p) => ({ karyawanId: p.karyawanId, tanggal: p.tanggal })) },
      select: { karyawanId: true, tanggal: true },
    });
    const adaSet = new Set(sudah.map((s) => `${s.karyawanId}|${iso(s.tanggal)}`));
    const baru = potong.filter((p) => !adaSet.has(`${p.karyawanId}|${iso(p.tanggal)}`));
    if (baru.length > 0) {
      await prisma.rosterShift.createMany({ data: baru });
      rosterBaru += baru.length;
    }
  }
  console.log(`roster: +${rosterBaru} baris`);
  const rosterSet = new Set(
    (await prisma.rosterShift.findMany({
      where: { tanggal: { gte: utc(2026, 8, 1), lte: utc(2026, 10, 30) } },
      select: { karyawanId: true, tanggal: true },
    })).map((r) => `${r.karyawanId}|${iso(r.tanggal)}`),
  );

  // ---------- 4. Rekap Sep–Okt ----------
  const hariKerja: Date[] = [];
  for (let d = new Date(Date.UTC(2026, 8, 1)); d <= new Date(Date.UTC(2026, 9, 31)); d = new Date(d.getTime() + 86_400_000)) {
    hariKerja.push(new Date(d));
  }
  let rekapBaru = 0;
  for (const k of aktifSemua) {
    const batch: Array<{ karyawanId: string; tanggal: Date; sumberJadwal: string; status: never; telatMenit: number; masukAktual: Date | null; keluarAktual: Date | null }> = [];
    for (const t of hariKerja) {
      const key = `${k.id}|${iso(t)}`;
      const ada = await prisma.rekapHarian.findUnique({
        where: { karyawanId_tanggal: { karyawanId: k.id, tanggal: t } },
        select: { id: true },
      });
      if (ada) continue;
      const dow = t.getUTCDay();
      if ((dow === 0 || dow === 6) && !rosterSet.has(key)) {
        batch.push({ karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "LIBUR" as never, telatMenit: 0, masukAktual: null, keluarAktual: null });
        continue;
      }
      const r = rnd();
      if (r < 0.88) {
        batch.push({
          karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "HADIR" as never, telatMenit: 0,
          masukAktual: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, int(50, 65))),
          keluarAktual: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 10, int(0, 30))),
        });
      } else if (r < 0.93) {
        const telat = int(5, 45);
        batch.push({
          karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "TERLAMBAT" as never, telatMenit: telat,
          masukAktual: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 1, telat)),
          keluarAktual: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 10, int(0, 30))),
        });
      } else if (r < 0.95) {
        batch.push({ karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "ALPA" as never, telatMenit: 0, masukAktual: null, keluarAktual: null });
      } else if (r < 0.97) {
        batch.push({ karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "CUTI" as never, telatMenit: 0, masukAktual: null, keluarAktual: null });
      } else if (r < 0.985) {
        batch.push({ karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "IZIN" as never, telatMenit: 0, masukAktual: null, keluarAktual: null });
      } else if (r < 0.995) {
        batch.push({ karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "SAKIT" as never, telatMenit: 0, masukAktual: null, keluarAktual: null });
      } else {
        batch.push({ karyawanId: k.id, tanggal: t, sumberJadwal: "DEMO", status: "DINAS" as never, telatMenit: 0, masukAktual: null, keluarAktual: null });
      }
    }
    if (batch.length > 0) {
      await prisma.rekapHarian.createMany({ data: batch });
      rekapBaru += batch.length;
    }
  }
  console.log(`rekap: +${rekapBaru} baris`);

  // ---------- 5. Cuti disetujui (Okt) + selaraskan rekap ----------
  const calonCuti = aktifSemua.filter((_, i) => i % 12 === 0).slice(0, 25);
  let cutiBaru = 0;
  for (const [n, k] of calonCuti.entries()) {
    const mulai = utc(2026, 9, 6 + (n % 18));
    const selesai = new Date(mulai.getTime() + (n % 3 + 2) * 86_400_000);
    const nomor = `CUTI-DMO3-${String(n + 1).padStart(4, "0")}`;
    const ada = await prisma.pengajuanKetidakhadiran.findUnique({ where: { nomorPengajuan: nomor }, select: { id: true } });
    if (ada) continue;
    const hari = Math.round((selesai.getTime() - mulai.getTime()) / 86_400_000) + 1;
    await prisma.pengajuanKetidakhadiran.create({
      data: {
        nomorPengajuan: nomor, karyawanId: k.id, jenisKetidakhadiranId: cutiTahunan.id,
        tanggalMulai: mulai, tanggalSelesai: selesai, jumlahHari: hari,
        alasan: "Demo dataset besar", status: "DISETUJUI", diajukanPada: mulai,
      },
    });
    for (let d = new Date(mulai); d <= selesai; d = new Date(d.getTime() + 86_400_000)) {
      await prisma.rekapHarian.upsert({
        where: { karyawanId_tanggal: { karyawanId: k.id, tanggal: new Date(d) } },
        create: { karyawanId: k.id, tanggal: new Date(d), sumberJadwal: "DEMO", status: "CUTI" },
        update: { status: "CUTI" },
      });
    }
    cutiBaru++;
  }
  console.log(`cuti disetujui: +${cutiBaru}`);

  // ---------- 6. Lembur disetujui (Okt) ----------
  const calonLembur = aktifSemua.filter((_, i) => i % 20 === 1).slice(0, 15);
  let lemburBaru = 0;
  for (const [n, k] of calonLembur.entries()) {
    const tgl = utc(2026, 9, 3 + n);
    const ada = await prisma.lembur.findFirst({ where: { karyawanId: k.id, tanggal: tgl }, select: { id: true } });
    if (ada) continue;
    await prisma.lembur.create({
      data: {
        karyawanId: k.id, tanggal: tgl,
        jamMulai: new Date(Date.UTC(1970, 0, 1, 17, 0)), jamSelesai: new Date(Date.UTC(1970, 0, 1, 19, 0)),
        jumlahJam: 2, alasan: "Demo dataset besar", status: "DISETUJUI",
      },
    });
    lemburBaru++;
  }
  console.log(`lembur disetujui: +${lemburBaru}`);

  // ---------- 7. Absensi riil (mobile demo) ----------
  const slotAbsen: Array<{ kid: string; tgl: Date; masuk: string; keluar: string }> = [];
  for (const nmr of ["DEMO-2026-002", "DMO.2026.IEMADUDDIN", "DMO.2026.DIDIN", "DMO.2026.IZZAH"]) {
    const k = await prisma.karyawan.findUnique({ where: { nomorKaryawan: nmr }, select: { id: true } });
    if (k) for (const d of [12, 13, 14]) {
      slotAbsen.push({ kid: k.id, tgl: utc(2026, 9, d), masuk: `08:0${int(1, 5)}`, keluar: `17:0${int(0, 9)}` });
    }
  }
  let absBaru = 0;
  for (const s of slotAbsen) {
    for (const [tipe, jam] of [["MASUK", s.masuk], ["KELUAR", s.keluar]] as const) {
      const [hh, mm] = jam.split(":").map(Number);
      const waktu = new Date(Date.UTC(s.tgl.getUTCFullYear(), s.tgl.getUTCMonth(), s.tgl.getUTCDate(), hh - 7, mm));
      const ada = await prisma.absensi.findFirst({
        where: { karyawanId: s.kid, tipe: tipe as never, waktu: { gte: s.tgl, lt: new Date(s.tgl.getTime() + 86_400_000) } },
        select: { id: true },
      });
      if (ada) continue;
      await prisma.absensi.create({
        data: { karyawanId: s.kid, waktu, tipe: tipe as never, sumber: "MOBILE", deviceId: "demo-device", status: "VALID" },
      });
      absBaru++;
    }
  }
  console.log(`absensi riil: +${absBaru}`);

  // ---------- 8. Kasbon + reimbursement disetujui ----------
  const penerDebitur = aktifSemua.filter((_, i) => i % 97 === 5).slice(0, 2);
  for (const [n, k] of penerDebitur.entries()) {
    const nomor = `KSB-DMO3-${String(n + 1).padStart(4, "0")}`;
    const ada = await prisma.kasbon.findUnique({ where: { nomor }, select: { id: true } });
    if (ada) continue;
    const nominal = (n + 1) * 5000000;
    await prisma.kasbon.create({
      data: {
        nomor, karyawanId: k.id, nominal, tenorBulan: 10,
        angsuranPerBulan: Math.round(nominal / 10), sisaHutang: nominal - 2 * Math.round(nominal / 10),
        mulaiPotong: utc(2026, 8, 1), alasan: "Demo dataset besar", status: "DISETUJUI",
      },
    });
  }
  const penerKlaim = aktifSemua.filter((_, i) => i % 89 === 7).slice(0, 3);
  const kats = ["TRANSPORT", "KONSUMSI", "PENGINAPAN"] as const;
  for (const [n, k] of penerKlaim.entries()) {
    const nomor = `RMB-DMO3-${String(n + 1).padStart(4, "0")}`;
    const ada = await prisma.expenseClaim.findUnique({ where: { nomor }, select: { id: true } });
    if (ada) continue;
    await prisma.expenseClaim.create({
      data: {
        nomor, karyawanId: k.id, kategori: kats[n % kats.length] as never,
        tanggalKwitansi: utc(2026, 9, 10 + n), nominal: (n + 1) * 150000,
        keterangan: "Demo dataset besar", lampiranUrl: "demo/struk.jpg",
        status: "DISETUJUI", diajukanPada: utc(2026, 9, 10 + n),
      },
    });
  }
  console.log("kasbon + reimbursement: OK");

  // ---------- 9. Salary run Sep + Okt DITERBITKAN ----------
  const { createSalaryRun, calculateSalaryRun, finalizeRun, publishRun } = await import("../src/modules/payroll/actions/payroll.actions");
  for (const per of ["2026-09", "2026-10"]) {
    let run = await prisma.salaryRun.findUnique({ where: { periode: per }, select: { id: true, status: true } });
    if (!run) {
      try { await createSalaryRun(per); } catch { /* revalidate di luar Next */ }
      run = await prisma.salaryRun.findUnique({ where: { periode: per }, select: { id: true, status: true } });
    }
    if (run && run.status !== "DITERBITKAN") {
      try { await calculateSalaryRun(run.id); } catch { /* revalidate */ }
      try { await finalizeRun(run.id); } catch { /* revalidate */ }
      try { await publishRun(run.id); } catch { /* revalidate */ }
    }
    const st = await prisma.salaryRun.findUnique({ where: { periode: per }, select: { status: true } });
    console.log(`run ${per}: ${st?.status}`);
  }

  // ---------- 10. THR Idul Adha 1447H DITERBITKAN ----------
  const { createThrRun, calculateThrRun, finalizeThrRun, publishThrRun } = await import("../src/modules/payroll/actions/thr.actions");
  let thr = await prisma.thrRun.findFirst({ where: { tahun: 2026, namaHariRaya: "Idul Adha" }, select: { id: true, status: true } });
  if (!thr) {
    try {
      await createThrRun({ year: 2026, holidayName: "Idul Adha", holidayDate: "2026-05-27", payDate: "2026-05-20" });
    } catch { /* revalidate */ }
    thr = await prisma.thrRun.findFirst({ where: { tahun: 2026, namaHariRaya: "Idul Adha" }, select: { id: true, status: true } });
  }
  if (thr && thr.status !== "DITERBITKAN") {
    try { await calculateThrRun(thr.id); } catch { /* revalidate */ }
    try { await finalizeThrRun(thr.id); } catch { /* revalidate */ }
    try { await publishThrRun(thr.id); } catch { /* revalidate */ }
  }
  console.log(`thr Idul Adha: ${(await prisma.thrRun.findFirst({ where: { tahun: 2026, namaHariRaya: "Idul Adha" }, select: { status: true } }))?.status}`);

  console.log(`SELESAI — total karyawan: ${await prisma.karyawan.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
