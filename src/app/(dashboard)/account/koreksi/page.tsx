import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import { getMyCorrections } from "@/src/modules/attendance/actions/koreksi.actions";
import KoreksiListClient from "@/src/modules/attendance/components/koreksi-list-client";

export default async function KoreksiPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const items = await getMyCorrections(session.user.id);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Koreksi Presensi</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Usulkan perbaikan jam presensi — HR tak lagi mengedit langsung.
        </p>
      </div>

      <div className="mt-5">
        <KoreksiListClient userId={session.user.id} items={items} />
      </div>
    </>
  );
}
