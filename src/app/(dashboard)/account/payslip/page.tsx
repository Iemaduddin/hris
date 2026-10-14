import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getSlipSaya } from "@/src/modules/payroll/actions/payroll.actions";
import { getThrSaya } from "@/src/modules/payroll/actions/thr.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default async function SlipSayaPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true, namaLengkap: true },
	});

	if (!karyawan) {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
				<h1 className="text-2xl font-semibold">Slip Gaji Saya</h1>
				<p className="mt-2 text-sm">Akun belum tertaut ke data karyawan. Hubungi HR.</p>
			</div>
		);
	}

	const slips = await getSlipSaya(karyawan.id);
	const thrSlips = await getThrSaya(karyawan.id);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Slip Gaji Saya</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{karyawan.namaLengkap}</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Periode</th>
								<th className="px-4 py-3 text-left font-semibold">Nomor</th>
								<th className="px-4 py-3 text-right font-semibold">Gaji Bersih</th>
								<th className="px-4 py-3 text-right font-semibold">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{slips.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-slate-500">
										Belum ada slip gaji yang diterbitkan.
									</td>
								</tr>
							) : (
								slips.map((s) => (
									<tr key={s.nomor} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3 font-medium">{s.periode}</td>
										<td className="px-4 py-3">{s.nomor}</td>
										<td className="px-4 py-3 text-right font-semibold">{rupiah.format(Number(s.gajiBersih))}</td>
										<td className="px-4 py-3 text-right">
											<Link href={`/account/payslip/${encodeURIComponent(s.nomor)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
												Lihat
											</Link>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
		</div>

		<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Slip THR Saya</h2>
			<div className="mt-3 overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="border-b border-blue-100 dark:border-blue-900/60">
							<th className="px-4 py-3 text-left font-semibold">THR</th>
							<th className="px-4 py-3 text-left font-semibold">Nomor</th>
							<th className="px-4 py-3 text-right font-semibold">Bersih</th>
							<th className="px-4 py-3 text-right font-semibold">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{thrSlips.length === 0 ? (
							<tr>
								<td colSpan={4} className="px-4 py-6 text-center text-slate-500">
									Belum ada slip THR yang diterbitkan.
								</td>
							</tr>
						) : (
							thrSlips.map((s) => (
								<tr key={s.nomor} className="border-b border-blue-100 dark:border-blue-900/60">
									<td className="px-4 py-3 font-medium">{s.namaHariRaya} {s.tahun}</td>
									<td className="px-4 py-3">{s.nomor}</td>
									<td className="px-4 py-3 text-right font-semibold">{rupiah.format(Number(s.bersih))}</td>
									<td className="px-4 py-3 text-right">
										<Link href={`/account/thr/${encodeURIComponent(s.nomor)}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
											Lihat
										</Link>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	</>
	);
}
