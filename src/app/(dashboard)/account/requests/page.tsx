import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getDinasList } from "@/src/modules/duty/actions/duty.actions";
import { getLemburList } from "@/src/modules/overtime/actions/overtime.actions";
import { getJenisCutiList, getPengajuanCuti, getSisaSaldoSaya } from "@/src/modules/leave/actions/leave.actions";
import PengajuanSayaClient from "@/src/modules/requests/components/my-requests-client";

export default async function PengajuanSayaPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: { id: true, namaLengkap: true },
	});

	if (!karyawan) {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan Saya</h1>
				<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
					Akun Anda belum tertaut ke data karyawan. Hubungi HR untuk menautkan akun.
				</p>
			</div>
		);
	}

	const tahun = new Date().getFullYear();
	const [cuti, lembur, dinas, saldo, jenisList] = await Promise.all([
		getPengajuanCuti({ karyawanId: karyawan.id }),
		getLemburList({ karyawanId: karyawan.id }),
		getDinasList({ karyawanId: karyawan.id }),
		getSisaSaldoSaya(karyawan.id, tahun),
		getJenisCutiList(),
	]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan Saya</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{karyawan.namaLengkap} — buat, ajukan, dan lacak status pengajuan Anda.
				</p>
			</div>

			<div className="mt-5">
				<PengajuanSayaClient
					karyawanId={karyawan.id}
					cuti={cuti}
					lembur={lembur}
					dinas={dinas}
					jenisOptions={jenisList.filter((j) => j.isActive).map((j) => ({ value: j.id, label: j.nama }))}
					saldo={saldo}
				/>
			</div>
		</>
	);
}
