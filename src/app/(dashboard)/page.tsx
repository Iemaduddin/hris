import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getAntrianSaya } from "@/src/modules/approval/actions/approval.actions";
import { getKontrakMasaBerakhir } from "@/src/modules/employee/actions/employee.actions";
import { getSisaSaldoSaya } from "@/src/modules/leave/actions/leave.actions";
import { getSlipSaya } from "@/src/modules/payroll/actions/payroll.actions";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";

export const metadata: Metadata = {
	title: "Dashboard",
};

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

	const isHr = role === "SUPER_ADMIN" || role === "ADMIN_HR";

	if (isHr) {
		const [headcount, kontrak, antrian] = await Promise.all([
			prisma.karyawan.count({ where: { status: { in: ["AKTIF", "PROBASI"] } } }),
			getKontrakMasaBerakhir(30),
			getAntrianSaya(session.user.id),
		]);
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const telat = await prisma.rekapHarian.count({
			where: { status: "TERLAMBAT", tanggal: { gte: weekAgo } },
		});
		return (
			<>
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard HR</h1>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ringkasan operasional hari ini.</p>
				</div>
				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
					<Card title="Karyawan Aktif" value={String(headcount)} href="/employees" linkText="Kelola" />
					<Card title="Kontrak H-30" value={String(kontrak.length)} href="/employees" linkText="Lihat" />
					<Card title="Approval Menunggu" value={String(antrian.length)} href="/approval" linkText="Proses" />
					<Card title="Keterlambatan 7 Hari" value={String(telat)} href="/recap" linkText="Rekap" />
				</div>
			</>
		);
	}

	if (role === "MANAJER") {
		const antrian = await getAntrianSaya(session.user.id);
		const tim = karyawan ? await prisma.karyawan.count({ where: { atasanLangsungId: karyawan.id } }) : 0;
		return (
			<>
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard Manajer</h1>
				</div>
				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
					<Card title="Persetujuan Menunggu" value={String(antrian.length)} href="/approval" linkText="Proses" />
					<Card title="Anggota Tim" value={String(tim)} />
				</div>
			</>
		);
	}

	if (role === "FINANCE") {
		const runs = await prisma.salaryRun.findMany({ orderBy: { periode: "desc" }, take: 5, select: { periode: true, status: true } });
		const latest = runs[0];
		return (
			<>
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard Finance</h1>
				</div>
				<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
					<Card title="Run Terakhir" value={latest ? `${latest.periode} (${latest.status})` : "-"} href="/payroll" linkText="Payroll" />
					<Card title="Total Run" value={String(await prisma.salaryRun.count())} href="/payroll" linkText="Lihat" />
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
	const pengajuanAktif = karyawan
		? await prisma.pengajuanKetidakhadiran.count({
				where: { karyawanId: karyawan.id, status: { in: ["DIAJUKAN", "MENUNGGU_APPROVAL"] } },
			})
		: 0;

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
					Halo, {karyawan?.namaLengkap ?? session.user.name ?? "Karyawan"}
				</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ringkasan Anda hari ini.</p>
			</div>
			<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-4">
				<Card title="Status Hari Ini" value={hariIni?.status.replaceAll("_", " ") ?? "-"} href="/akun/attendance" linkText="Presensi" />
				<Card title="Sisa Cuti" value={saldo.length > 0 ? saldo.map((s) => `${s.sisa}`).join(" + ") : "-"} href="/akun/requests" linkText="Ajukan" />
				<Card title="Pengajuan Berjalan" value={String(pengajuanAktif)} href="/akun/requests" linkText="Lacak" />
				<Card title="Slip Terakhir" value={slips[0]?.periode ?? "-"} href="/akun/payslip" linkText="Slip Saya" />
			</div>
		</>
	);
}
