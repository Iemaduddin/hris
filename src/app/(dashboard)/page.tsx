import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { toDbDate } from "@/src/lib/time";
import { getAntrianSaya } from "@/src/modules/approval/actions/approval.actions";
import { getKontrakMasaBerakhir } from "@/src/modules/employee/actions/employee.actions";
import { getSisaSaldoSaya } from "@/src/modules/leave/actions/leave.actions";
import { getSlipSaya } from "@/src/modules/payroll/actions/payroll.actions";
import { getProbationMendekati } from "@/src/modules/employee/actions/probation.actions";
import { getSPAktif } from "@/src/modules/employee/actions/disiplin.actions";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";
import { Baris, Kosong, Panel } from "@/src/components/dashboard/panel";
import KehadiranChart, { type IrisanKehadiran } from "@/src/components/dashboard/kehadiran-chart";
import TrenChart, { type TrenItem } from "@/src/components/dashboard/tren-chart";

export const metadata: Metadata = {
	title: "Dashboard",
};

const rupiah = new Intl.NumberFormat("id-ID");
const tanggalId = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function Card({ title, value, href, linkText }: { title: string; value: string; href?: string; linkText?: string }) {
	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
			<p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
			{href ? (
				<Link href={href} className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
					{linkText ?? "Lihat"} →
				</Link>
			) : null}
		</div>
	);
}

const WARNA_SEGMEN: Record<string, string> = {
	HADIR: "bg-emerald-500",
	TERLAMBAT: "bg-amber-500",
	ALPA: "bg-rose-500",
	CUTI: "bg-sky-500",
	IZIN: "bg-violet-500",
	SAKIT: "bg-orange-500",
	DINAS: "bg-cyan-500",
	LIBUR: "bg-slate-300",
};

function SegmenKehadiran({ sebaran }: { sebaran: Array<{ status: string; jumlah: number }> }) {
	const total = sebaran.reduce((acc, s) => acc + s.jumlah, 0);
	if (total === 0) return <Kosong teks="Belum ada data kehadiran hari ini." />;
	return (
		<div>
			<div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
				{sebaran.map((s) => (
					<div
						key={s.status}
						className={WARNA_SEGMEN[s.status] ?? "bg-slate-400"}
						style={{ width: `${(s.jumlah / total) * 100}%` }}
						title={`${s.status}: ${s.jumlah}`}
					/>
				))}
			</div>
			<ul className="mt-3 grid grid-cols-2 gap-x-4">
				{sebaran.map((s) => (
					<Baris key={s.status} kiri={s.status} kanan={String(s.jumlah)} />
				))}
			</ul>
		</div>
	);
}

function HeaderJudul({ judul, sub }: { judul: string; sub?: string }) {
	return (
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{judul}</h1>
			{sub ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{sub}</p> : null}
		</div>
	);
}

export default async function DashboardPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { role: true },
	});
	const role = user?.role ?? "EMPLOYEE";
	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true, namaLengkap: true },
	});

	const kini = new Date();
	const awalHari = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
	const akhirHari = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate(), 23, 59, 59, 999);
	const awalBulan = new Date(kini.getFullYear(), kini.getMonth(), 1);
	const rentangHari = { gte: awalHari, lte: akhirHari };

	if (role === "SUPER_ADMIN" || role === "ADMIN_HR") {
		const [headcount, kontrak, antrian] = await Promise.all([
			prisma.karyawan.count({ where: { status: { in: ["AKTIF", "PROBASI"] } } }),
			getKontrakMasaBerakhir(30),
			getAntrianSaya(session.user.id),
		]);
		const probasi = await getProbationMendekati(30);
		const spAktif = await getSPAktif();
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const [
			telat,
			sebaran,
			alpaHariIni,
			liburMendatang,
			rosterHariIni,
			rosterContoh,
			masukBulanIni,
			resignBulanIni,
			lemburRows,
		] = await Promise.all([
			prisma.rekapHarian.count({ where: { status: "TERLAMBAT", tanggal: { gte: weekAgo } } }),
			prisma.rekapHarian.groupBy({ by: ["status"], where: { tanggal: rentangHari }, _count: { status: true } }),
			prisma.rekapHarian.findMany({
				where: { tanggal: rentangHari, status: "ALPA" },
				include: { karyawan: { select: { namaLengkap: true, nomorKaryawan: true } } },
				orderBy: { karyawan: { namaLengkap: "asc" } },
				take: 5,
			}),
			prisma.hariLibur.findMany({ where: { tanggal: { gte: awalHari } }, orderBy: { tanggal: "asc" }, take: 3 }),
			prisma.rosterShift.count({ where: { tanggal: rentangHari } }),
			prisma.rosterShift.findMany({
				where: { tanggal: rentangHari },
				include: { karyawan: { select: { namaLengkap: true } }, shift: { select: { nama: true } } },
				take: 5,
			}),
			prisma.karyawan.findMany({
				where: { tanggalMasuk: { gte: awalBulan } },
				select: { namaLengkap: true, nomorKaryawan: true },
				orderBy: { tanggalMasuk: "desc" },
				take: 5,
			}),
			prisma.karyawan.findMany({
				where: { tanggalResign: { gte: awalBulan } },
				select: { namaLengkap: true, nomorKaryawan: true },
				orderBy: { tanggalResign: "desc" },
				take: 5,
			}),
			prisma.lembur.findMany({
				where: { tanggal: { gte: new Date(kini.getFullYear(), kini.getMonth() - 5, 1) }, status: "DISETUJUI" },
				select: { tanggal: true, jumlahJam: true },
			}),
		]);

		const aktif = await prisma.karyawan.findMany({
			where: { status: { in: ["AKTIF", "PROBASI"] } },
			select: { namaLengkap: true, tanggalLahir: true },
		});
		const ultah = aktif.filter((k) => k.tanggalLahir && k.tanggalLahir.getMonth() === kini.getMonth()).slice(0, 5);

		const sebaranUrutan = sebaran
			.map((s) => ({ status: s.status, jumlah: s._count.status }))
			.sort((a, b) => b.jumlah - a.jumlah);
		const irisan: IrisanKehadiran[] = sebaranUrutan.map((s) => ({ id: s.status, label: s.status, value: s.jumlah }));

		const trenLembur: TrenItem[] = [];
		for (let i = 5; i >= 0; i--) {
			const acuan = new Date(kini.getFullYear(), kini.getMonth() - i, 1);
			const kunci = `${acuan.getFullYear()}-${acuan.getMonth()}`;
			const total = lemburRows
				.filter((r) => `${r.tanggal.getFullYear()}-${r.tanggal.getMonth()}` === kunci)
				.reduce((acc, r) => acc + Number(r.jumlahJam), 0);
			trenLembur.push({ label: acuan.toLocaleString("id-ID", { month: "short" }), nilai: Math.round(total * 10) / 10 });
		}

		return (
			<>
				<HeaderJudul judul="Dashboard HR" sub="Ringkasan operasional hari ini." />
				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
					<Card title="Karyawan Aktif" value={String(headcount)} href="/employees" linkText="Kelola" />
					<Card title="Kontrak H-30" value={String(kontrak.length)} href="/employees" linkText="Lihat" />
					<Card title="Approval Menunggu" value={String(antrian.length)} href="/approval" linkText="Proses" />
					<Card title="Keterlambatan 7 Hari" value={String(telat)} href="/recap" linkText="Rekap" />
				</div>

				<div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
					<Panel title="Perlu Perhatian" href="/approval" linkText="Approval Center">
						{antrian.length === 0 && kontrak.length === 0 && alpaHariIni.length === 0 && probasi.length === 0 && spAktif.length === 0 ? (
							<Kosong teks="Semua aman. Tidak ada yang menunggu." />
						) : (
							<ul>
								{antrian.slice(0, 5).map((a) => (
									<Baris key={`${a.type}-${a.id}`} kiri={`${a.nomor} · ${a.karyawanNama} — ${a.ringkasan}`} kanan={`Tahap ${a.tahap}`} />
								))}
								{kontrak.slice(0, 5).map((k) => (
									<Baris key={k.id} kiri={`Kontrak ${k.karyawanNama} berakhir ${tanggalId(new Date(k.tanggalSelesai))}`} kanan={`H-${k.sisaHari}`} />
								))}
								{probasi.slice(0, 5).map((r) => (
									<Baris key={r.id} kiri={`Probasi ${r.karyawanNama} berakhir ${r.tanggalSelesai}`} kanan={r.sisaHari < 0 ? `lewat ${-r.sisaHari} hari` : `H-${r.sisaHari}`} />
								))}
								{spAktif.map((s) => (
									<Baris key={s.id} kiri={`${s.tingkatLabel} aktif: ${s.karyawanNama}`} kanan={s.nomor} />
								))}
								{alpaHariIni.map((r) => (
									<Baris key={r.karyawan.nomorKaryawan} kiri={`${r.karyawan.namaLengkap} tidak hadir hari ini`} kanan="ALPA" />
								))}
							</ul>
						)}
					</Panel>
					<Panel title="Kehadiran Hari Ini" href="/recap" linkText="Rekap">
						<SegmenKehadiran sebaran={sebaranUrutan} />
					</Panel>
				</div>

				<div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
					<Panel title="Sebaran Kehadiran Hari Ini">
						<KehadiranChart data={irisan} />
					</Panel>
					<Panel title="Tren Lembur Disetujui (6 Bulan)" href="/overtime" linkText="Lembur">
						<TrenChart data={trenLembur} sumbuY="Jam" format="jam" />
					</Panel>
				</div>

				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
					<Panel title="Orang Bulan Ini" href="/employees" linkText="Karyawan">
						<ul>
							{ultah.map((k) => (
								<Baris key={k.namaLengkap} kiri={`${k.namaLengkap} berulang tahun`} kanan={k.tanggalLahir ? tanggalId(k.tanggalLahir) : ""} />
							))}
							{masukBulanIni.map((k) => (
								<Baris key={`in-${k.nomorKaryawan}`} kiri={`${k.namaLengkap} bergabung`} kanan={k.nomorKaryawan} />
							))}
							{resignBulanIni.map((k) => (
								<Baris key={`out-${k.nomorKaryawan}`} kiri={`${k.namaLengkap} resign`} kanan={k.nomorKaryawan} />
							))}
							{ultah.length === 0 && masukBulanIni.length === 0 && resignBulanIni.length === 0 ? (
								<Kosong teks="Tidak ada peristiwa bulan ini." />
							) : null}
						</ul>
					</Panel>
					<Panel title="Libur Mendatang" href="/settings/work-schedule" linkText="Kalender">
						{liburMendatang.length === 0 ? (
							<Kosong teks="Tidak ada libur terjadwal." />
						) : (
							<ul>
								{liburMendatang.map((l) => (
									<Baris key={l.id} kiri={l.nama} kanan={tanggalId(l.tanggal)} />
								))}
							</ul>
						)}
					</Panel>
					<Panel title={`Roster Bertugas (${rosterHariIni})`} href="/roster" linkText="Roster">
						{rosterContoh.length === 0 ? (
							<Kosong teks="Belum ada roster hari ini." />
						) : (
							<ul>
								{rosterContoh.map((r) => (
									<Baris key={`${r.karyawanId}-${r.id}`} kiri={r.karyawan.namaLengkap} kanan={r.shift.nama} />
								))}
							</ul>
						)}
					</Panel>
				</div>
			</>
		);
	}

	if (role === "MANAJER" && karyawan) {
		const antrian = await getAntrianSaya(session.user.id);
		const tim = await prisma.karyawan.findMany({
			where: { atasanLangsungId: karyawan.id },
			select: {
				id: true,
				namaLengkap: true,
				rekapHarian: { where: { tanggal: rentangHari }, select: { status: true }, take: 1 },
			},
			orderBy: { namaLengkap: "asc" },
		});
		return (
			<>
				<HeaderJudul judul="Dashboard Manajer" />
				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
					<Card title="Persetujuan Menunggu" value={String(antrian.length)} href="/approval" linkText="Proses" />
					<Card title="Anggota Tim" value={String(tim.length)} />
				</div>
				<div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
					<Panel title="Antrean Saya" href="/approval" linkText="Proses Semua">
						{antrian.length === 0 ? (
							<Kosong teks="Tidak ada pengajuan menunggu." />
						) : (
							<ul>
								{antrian.slice(0, 5).map((a) => (
									<Baris key={`${a.type}-${a.id}`} kiri={`${a.nomor} · ${a.karyawanNama} — ${a.ringkasan}`} kanan={`Tahap ${a.tahap}`} />
								))}
							</ul>
						)}
					</Panel>
					<Panel title="Tim Hari Ini">
						{tim.length === 0 ? (
							<Kosong teks="Belum ada anggota tim." />
						) : (
							<ul>
								{tim.map((t) => (
									<Baris key={t.id} kiri={t.namaLengkap} kanan={t.rekapHarian[0]?.status.replaceAll("_", " ") ?? "-"} />
								))}
							</ul>
						)}
					</Panel>
				</div>
			</>
		);
	}

	if (role === "FINANCE") {
		const runs = await prisma.salaryRun.findMany({ orderBy: { periode: "desc" }, take: 6, select: { id: true, periode: true, status: true } });
		const latest = runs[0];
		const total = latest
			? await prisma.salaryRunDetail.aggregate({ where: { runId: latest.id }, _sum: { gajiBersih: true }, _count: true })
			: null;
		const bersihPerRun = await prisma.salaryRunDetail.groupBy({
			by: ["runId"],
			where: { runId: { in: runs.map((r) => r.id) } },
			_sum: { gajiBersih: true },
		});
		const trenGaji: TrenItem[] = [...runs].reverse().map((r) => ({
			label: r.periode,
			nilai: Number(bersihPerRun.find((b) => b.runId === r.id)?._sum.gajiBersih ?? 0),
		}));
		return (
			<>
				<HeaderJudul judul="Dashboard Finance" />
				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
					<Card title="Run Terakhir" value={latest ? latest.periode : "-"} href="/payroll" linkText="Payroll" />
					<Card
						title="Total Bersih Run Terakhir"
						value={total?._sum.gajiBersih ? `Rp${rupiah.format(Number(total._sum.gajiBersih))}` : "-"}
					/>
					<Card title="Slip Dihitung" value={String(total?._count ?? 0)} href="/payroll" linkText="Lihat" />
				</div>
				<div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
					<Panel title="Total Gaji Bersih per Periode" href="/payroll" linkText="Payroll">
						<TrenChart data={trenGaji} sumbuY="Rp" format="rupiah" />
					</Panel>
					<Panel title="Riwayat Run" href="/payroll" linkText="Semua">
						{runs.length === 0 ? (
							<Kosong teks="Belum ada salary run." />
						) : (
							<ul>
								{runs.map((r) => (
									<Baris key={r.id} kiri={r.periode} kanan={r.status} />
								))}
							</ul>
						)}
					</Panel>
				</div>
			</>
		);
	}

	const tahun = new Date().getFullYear();
	const [hariIni, saldo, slips] = await Promise.all([
		karyawan ? hitungRekapHarian(karyawan.id, new Date()) : null,
		karyawan ? getSisaSaldoSaya(karyawan.id, tahun) : [],
		karyawan ? getSlipSaya(karyawan.id) : [],
	]);
	const [pengajuanAktif, pengajuanTerakhir, shiftSaya] = await Promise.all([
		karyawan
			? prisma.pengajuanKetidakhadiran.count({
					where: { karyawanId: karyawan.id, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL"] } },
				})
			: 0,
		karyawan
			? prisma.pengajuanKetidakhadiran.findMany({
					where: { karyawanId: karyawan.id },
					orderBy: { createdAt: "desc" },
					take: 3,
					select: { nomorPengajuan: true, status: true },
				})
			: [],
		karyawan
			? prisma.rosterShift.findUnique({
					where: { karyawanId_tanggal: { karyawanId: karyawan.id, tanggal: toDbDate(new Date()) } },
					include: { shift: true },
				})
			: null,
	]);

	return (
		<>
			<HeaderJudul judul={`Halo, ${karyawan?.namaLengkap ?? session.user.name ?? "Karyawan"}`} sub="Ringkasan Anda hari ini." />
			<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
				<Card title="Status Hari Ini" value={hariIni?.status.replaceAll("_", " ") ?? "-"} href="/account/attendance" linkText="Presensi" />
				<Card title="Sisa Cuti" value={saldo.length > 0 ? saldo.map((s) => `${s.sisa}`).join(" + ") : "-"} href="/account/requests" linkText="Ajukan" />
				<Card title="Pengajuan Berjalan" value={String(pengajuanAktif)} href="/account/requests" linkText="Lacak" />
				<Card title="Slip Terakhir" value={slips[0]?.periode ?? "-"} href="/account/payslip" linkText="Slip Saya" />
			</div>
			<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
				<Panel title="Jadwal Saya Hari Ini" href="/account/attendance" linkText="Presensi">
					{shiftSaya ? (
						<ul>
							<Baris kiri="Shift" kanan={shiftSaya.shift.nama} />
							<Baris kiri="Jam masuk" kanan={shiftSaya.shift.jamMasuk?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) ?? "-"} />
							<Baris kiri="Jam keluar" kanan={shiftSaya.shift.jamKeluar?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) ?? "-"} />
						</ul>
					) : (
						<Kosong teks="Tidak ada jadwal/roster hari ini." />
					)}
				</Panel>
				<Panel title="Sisa Cuti per Jenis" href="/account/requests" linkText="Ajukan">
					{saldo.length === 0 ? (
						<Kosong teks="Belum ada saldo cuti." />
					) : (
						<ul>
							{saldo.map((s) => (
								<Baris key={s.jenis} kiri={s.jenis} kanan={`${s.sisa} hari`} />
							))}
						</ul>
					)}
				</Panel>
				<Panel title="Pengajuan Terakhir" href="/account/requests" linkText="Semua">
					{pengajuanTerakhir.length === 0 ? (
						<Kosong teks="Belum ada pengajuan." />
					) : (
						<ul>
							{pengajuanTerakhir.map((p) => (
								<Baris key={p.nomorPengajuan} kiri={p.nomorPengajuan} kanan={p.status.replaceAll("_", " ")} />
							))}
						</ul>
					)}
				</Panel>
			</div>
		</>
	);
}
