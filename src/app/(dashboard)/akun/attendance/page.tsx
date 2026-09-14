import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getRekapBulanan } from "@/src/modules/recap/actions/recap.actions";
import { hitungRekapHarian } from "@/src/modules/recap/lib/recap-engine";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" });

export default async function PresensiSayaPage({
	searchParams,
}: {
	searchParams: Promise<{ periode?: string }>;
}) {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true, namaLengkap: true },
	});
	if (!karyawan) {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
				<h1 className="text-2xl font-semibold">Presensi Saya</h1>
				<p className="mt-2 text-sm">Akun belum tertaut ke data karyawan. Hubungi HR.</p>
			</div>
		);
	}

	const params = await searchParams;
	const now = new Date();
	let tahun = now.getFullYear();
	let bulan = now.getMonth() + 1;
	if (params.periode) {
		const [y, m] = params.periode.split("-").map(Number);
		if (y && m >= 1 && m <= 12) {
			tahun = y;
			bulan = m;
		}
	}

	const [items, hariIni] = await Promise.all([
		getRekapBulanan(tahun, bulan, karyawan.id),
		hitungRekapHarian(karyawan.id, new Date()),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Presensi Saya</h1>
				<p className="mt-2 text-sm text-slate-500">
					{karyawan.namaLengkap} • Hari ini: <span className="font-semibold">{hariIni?.status.replaceAll("_", " ") ?? "-"}</span>
				</p>
			</div>

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h2 className="text-lg font-semibold">
					Rekap {tahun}-{String(bulan).padStart(2, "0")}
				</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead>
							<tr className="border-b border-blue-100 dark:border-blue-900/60">
								<th className="px-4 py-3 text-left font-semibold">Tanggal</th>
								<th className="px-4 py-3 text-left font-semibold">Status</th>
								<th className="px-4 py-3 text-right font-semibold">Telat</th>
								<th className="px-4 py-3 text-right font-semibold">Lembur</th>
							</tr>
						</thead>
						<tbody>
							{items.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-6 text-center text-slate-500">
										Belum ada rekap periode ini.
									</td>
								</tr>
							) : (
								items.map((item) => (
									<tr key={item.id} className="border-b border-blue-100 dark:border-blue-900/60">
										<td className="px-4 py-3">{dateFormatter.format(new Date(item.tanggal))}</td>
										<td className="px-4 py-3 font-medium">{item.status.replaceAll("_", " ")}</td>
										<td className="px-4 py-3 text-right">{item.telatMenit}&prime;</td>
										<td className="px-4 py-3 text-right">{item.lemburMenit}&prime;</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<p className="mt-3 text-xs text-slate-400">
					Untuk presensi mandiri gunakan aplikasi mobile (clock-in/out).
				</p>
			</div>
		</>
	);
}
