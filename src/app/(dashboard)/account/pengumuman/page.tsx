import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getPengumumanSayaInti, getPeristiwaMingguIni } from "@/src/modules/employee/actions/pengumuman.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import type { PengumumanItem } from "@/src/modules/employee/actions/pengumuman.actions";

const kolom: DataTableColumn<PengumumanItem>[] = [
	{ id: "judul", header: "Judul", accessor: "judul" },
	{
		id: "target",
		header: "Target",
		render: (r) => <span>{r.unitNama ?? "Semua"}</span>,
		sortValue: (r) => r.unitNama ?? "Semua",
	},
	{ id: "isi", header: "Isi", accessor: "isi" },
];

export default async function PengumumanSayaPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");
	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true },
	});
	if (!karyawan) redirect("/");

	const [items, peristiwa] = await Promise.all([
		getPengumumanSayaInti(karyawan.id),
		getPeristiwaMingguIni(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengumuman</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Info perusahaan untuk Anda — global dan unit Anda.
				</p>
			</div>

			{peristiwa.length > 0 && (
				<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Minggu Ini 🎉</h2>
					<ul className="mt-2 space-y-1 text-sm">
						{peristiwa.map((p) => (
							<li key={`${p.jenis}-${p.nomorKaryawan}`}>
								{p.jenis === "ULTAH" ? "🎂" : "🏅"} {p.namaLengkap} — {p.info} ({p.tanggal})
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<DataTable
					data={items}
					columns={kolom}
					getRowId={(r) => r.id}
					emptyMessage="Belum ada pengumuman untuk Anda."
				/>
			</div>
		</>
	);
}
