import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getUpdateDataSaya } from "@/src/modules/employee/actions/updatedata.actions";
import UpdateDataClient from "@/src/modules/employee/components/updatedata-client";

export default async function UpdateDataSayaPage() {
	const session = await getCurrentSession();
	if (!session) redirect("/login");

	const karyawan = await prisma.karyawan.findFirst({
		where: { userId: session.user.id },
		select: {
			id: true,
			alamat: true,
			telepon: true,
			email: true,
			keluargaKaryawan: { select: { id: true, nama: true, hubungan: true } },
		},
	});
	if (!karyawan) redirect("/");

	const items = await getUpdateDataSaya(session.user.id);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Update Data</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Usulkan perubahan alamat, kontak, keluarga, pendidikan, dan dokumen — diverifikasi HR.
				</p>
			</div>

			<div className="mt-5">
				<UpdateDataClient
					userId={session.user.id}
					items={items}
					saatIni={{
						alamat: karyawan.alamat ?? "",
						telepon: karyawan.telepon ?? "",
						email: karyawan.email ?? "",
					}}
					keluarga={karyawan.keluargaKaryawan}
				/>
			</div>
		</>
	);
}
