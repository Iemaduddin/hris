import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { listLimits, listReimbursements } from "@/src/modules/payroll/actions/reimbursements.actions";
import ReimbursementListClient from "@/src/modules/payroll/components/reimbursements-list-client";

export default async function ReimbursementPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, plafon] = await Promise.all([listReimbursements(), listLimits()]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Reimbursement</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Plafon, klaim masuk, dan pembayaran (tunai atau gaji run berikutnya).
        </p>
      </div>

      <div className="mt-5">
        <ReimbursementListClient userId={session.user.id} items={items} plafon={plafon} />
      </div>
    </>
  );
}
