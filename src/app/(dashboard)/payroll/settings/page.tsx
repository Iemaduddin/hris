import { requireUserRole } from "@/src/lib/auth-guard";
import { getPayrollSettings } from "@/src/modules/payroll/actions/payroll.actions";
import PayrollSettingsClient from "@/src/modules/payroll/components/payroll-settings-client";

export default async function PayrollSettingsPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const items = await getPayrollSettings();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Aturan Payroll</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pembagi alpa, tarif denda keterlambatan, dan batasnya. Berlaku global untuk semua karyawan.
        </p>
      </div>

      <div className="mt-5">
        <PayrollSettingsClient items={items} />
      </div>
    </>
  );
}
