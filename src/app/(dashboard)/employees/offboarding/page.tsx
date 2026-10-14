import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getOffboardingList, getOffboardingOptions } from "@/src/modules/employee/actions/offboarding.actions";
import OffboardingListClient from "@/src/modules/employee/components/offboarding-list-client";

export default async function OffboardingPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, karyawanOptions] = await Promise.all([getOffboardingList(), getOffboardingOptions()]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Offboarding / Resign</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pengajuan → persetujuan → clearance → selesai (RESIGN + paklaring + akun nonaktif).
        </p>
      </div>

      <div className="mt-5">
        <OffboardingListClient userId={session.user.id} items={items} karyawanOptions={karyawanOptions} />
      </div>
    </>
  );
}
