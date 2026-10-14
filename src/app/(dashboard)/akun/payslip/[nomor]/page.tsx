import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getPayslip } from "@/src/modules/payroll/actions/payroll.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default async function SlipSayaDetailPage({ params }: { params: Promise<{ nomor: string }> }) {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true },
	});
	if (!karyawan) notFound();

	const { nomor } = await params;
	const slip = await getPayslip(decodeURIComponent(nomor), karyawan.id);
	if (!slip) notFound();

	const pendapatan = slip.rincian.filter((r) => r.kelompok === "PENDAPATAN" || r.kelompok === "TUNJANGAN");
	const potongan = slip.rincian.filter((r) => r.kelompok === "POTONGAN" || r.kelompok === "IURAN");
	const biayaPerusahaan = slip.rincian.filter((r) => r.kelompok === "BIAYA_PERUSAHAAN");

	return (
		<>
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Slip Gaji {slip.periode}</h1>
					<p className="mt-2 text-sm text-slate-500">
						{slip.karyawanNama} ({slip.nomorKaryawan}) • {slip.nomor}
					</p>
				</div>
				<a href={`/api/akun/slip/${encodeURIComponent(slip.nomor)}`} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">
					Unduh PDF
				</a>
			</div>
		</div>

			<div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h2 className="text-lg font-semibold">Pendapatan</h2>
					<ul className="mt-3 space-y-2 text-sm">
						{pendapatan.map((r) => (
							<li key={r.kode} className="flex justify-between gap-4">
								<span>{r.nama}</span>
								<span className="font-medium">{rupiah.format(r.jumlah)}</span>
							</li>
						))}
						<li className="flex justify-between gap-4 border-t border-blue-100 pt-2 font-semibold dark:border-blue-900/60">
							<span>Total</span>
							<span>{rupiah.format(Number(slip.totalPendapatan))}</span>
						</li>
					</ul>
				</div>

				<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
					<h2 className="text-lg font-semibold">Potongan & Iuran</h2>
					<ul className="mt-3 space-y-2 text-sm">
						{potongan.length === 0 ? <li className="text-slate-500">Tidak ada.</li> : null}
						{potongan.map((r) => (
							<li key={r.kode} className="flex justify-between gap-4">
								<span>{r.nama}</span>
								<span className="font-medium">{rupiah.format(r.jumlah)}</span>
							</li>
						))}
						<li className="flex justify-between gap-4 border-t border-blue-100 pt-2 font-semibold dark:border-blue-900/60">
							<span>Total</span>
							<span>{rupiah.format(Number(slip.totalPotongan))}</span>
						</li>
					</ul>
				</div>
			</div>

		<div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
			<div className="flex items-center justify-between">
				<span className="text-lg font-semibold">Gaji Bersih</span>
				<span className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">
					{rupiah.format(Number(slip.gajiBersih))}
				</span>
			</div>
		</div>

		{biayaPerusahaan.length > 0 ? (
			<div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
				<h2 className="text-lg font-semibold">Ditanggung Perusahaan (tidak memotong gaji)</h2>
				<ul className="mt-3 space-y-2 text-sm">
					{biayaPerusahaan.map((r) => (
						<li key={r.kode} className="flex justify-between gap-4">
							<span>{r.nama}</span>
							<span className="font-medium">{rupiah.format(r.jumlah)}</span>
						</li>
					))}
					<li className="flex justify-between gap-4 border-t border-sky-200 pt-2 font-semibold dark:border-sky-900/60">
						<span>Total</span>
						<span>{rupiah.format(Number(slip.totalBiayaPerusahaan))}</span>
					</li>
				</ul>
			</div>
		) : null}
	</>
	);
}
