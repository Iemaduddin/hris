import { requireUserRole } from "@/src/lib/auth-guard";
import { listLeaveRequests, listLeaveBalances, listLeaveTypes } from "@/src/modules/leave/actions/leave.actions";
import { getActiveEmployeeOptions } from "@/src/modules/recap/actions/recap.actions";
import LeaveClient from "@/src/modules/leave/components/leave-client";

export default async function LeavePage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const year = new Date().getFullYear();

  const [items, balance, employeeOptions, leaveTypes] = await Promise.all([
    listLeaveRequests(),
    listLeaveBalances(year),
    getActiveEmployeeOptions(),
    listLeaveTypes(),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cuti & Izin</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pengajuan karyawan dan sisa saldo. Persetujuan via Approval Center.
        </p>
      </div>

      <div className="mt-5">
        <LeaveClient
          items={items}
          balance={balance}
          year={year}
          employeeOptions={employeeOptions}
          leaveTypeOptions={leaveTypes.filter((j) => j.isActive).map((j) => ({ value: j.id, label: j.name, requiresAttachment: j.requiresAttachment }))}
        />
      </div>
    </>
  );
}
