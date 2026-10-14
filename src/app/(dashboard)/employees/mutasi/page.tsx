import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getMutasiList, getMutasiOptions } from "@/src/modules/employee/actions/mutasi.actions";
import MutasiListClient from "@/src/modules/employee/components/mutasi-list-client";

export default async function MutasiPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, options] = await Promise.all([getMutasiList(session.user.id), getMutasiOptions(session.user.id)]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mutasi / Promosi / Demosi</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Usulan → persetujuan atasan dan HR → diterapkan ke penempatan (riwayat tersimpan).
        </p>
      </div>

      <div className="mt-5">
        <MutasiListClient userId={session.user.id} items={items} options={options} />
      </div>
    </>
  );
}
