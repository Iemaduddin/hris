import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getProbationList, getProbationOptions } from "@/src/modules/employees/actions/probation.actions";
import ProbationListClient from "@/src/modules/employees/components/probation-list-client";

export default async function ProbationPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, karyawanOptions] = await Promise.all([
    getProbationList(session.user.id),
    getProbationOptions(session.user.id),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Probation Review</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Penilaian masa percobaan → lulus (AKTIF), perpanjang, atau tidak lulus.
        </p>
      </div>

      <div className="mt-5">
        <ProbationListClient userId={session.user.id} items={items} karyawanOptions={karyawanOptions} />
      </div>
    </>
  );
}
