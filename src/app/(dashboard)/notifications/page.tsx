import { requireAuthenticatedUser } from "@/src/lib/auth-guard";
import { getNotifikasiSaya, getPreferensiSaya } from "@/src/modules/notifikasi/actions/notifikasi.actions";
import NotifikasiClient from "@/src/modules/notifikasi/components/notifikasi-client";

export default async function NotificationsPage() {
	await requireAuthenticatedUser();
	const [items, preferensi] = await Promise.all([getNotifikasiSaya(), getPreferensiSaya()]);

	return (
		<>
			<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Notifikasi</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					Pengajuan masuk, keputusan approval, dan info — ketuk judul untuk deep-link ke halaman terkait.
				</p>
			</div>

			<div className="mt-5">
				<NotifikasiClient initial={items} preferensi={preferensi} />
			</div>
		</>
	);
}
