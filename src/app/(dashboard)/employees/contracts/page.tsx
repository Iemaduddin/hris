import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getExpiringContracts } from "@/src/modules/employees/actions/employee.actions";
import ContractListClient from "@/src/modules/employees/components/contract-list-client";

export default async function ContractsPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const items = await getExpiringContracts(60);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kontrak Kerja</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Perpanjangan massal + tanda tangan kontrak.
        </p>
      </div>

      <div className="mt-5">
        <ContractListClient userId={session.user.id} items={items} />
      </div>
    </>
  );
}
