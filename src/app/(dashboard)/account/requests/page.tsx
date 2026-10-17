import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { listDuties } from "@/src/modules/duty/actions/duty.actions";
import { listOvertime } from "@/src/modules/overtime/actions/overtime.actions";
import { listLeaveRequests, listLeaveTypes, getMyRemainingBalance } from "@/src/modules/leave/actions/leave.actions";
import MyRequestsClient from "@/src/modules/requests/components/my-requests-client";

export default async function MyRequestsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const employee = await prisma.karyawan.findFirst({
    where: { userId: session.user.id },
    select: { id: true, namaLengkap: true },
  });

  if (!employee) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan Saya</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Akun Anda belum tertaut ke data karyawan. Hubungi HR untuk menautkan akun.
        </p>
      </div>
    );
  }

  const year = new Date().getFullYear();
  const [leave, overtime, duty, balance, leaveTypes] = await Promise.all([
    listLeaveRequests({ employeeId: employee.id }),
    listOvertime({ employeeId: employee.id }),
    listDuties({ employeeId: employee.id }),
    getMyRemainingBalance(employee.id, year),
    listLeaveTypes(),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan Saya</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {employee.namaLengkap} — buat, ajukan, dan lacak status pengajuan Anda.
        </p>
      </div>

      <div className="mt-5">
        <MyRequestsClient
          employeeId={employee.id}
          leave={leave}
          overtime={overtime}
          duty={duty}
          leaveTypeOptions={leaveTypes.filter((j) => j.isActive).map((j) => ({ value: j.id, label: j.name }))}
          balance={balance}
        />
      </div>
    </>
  );
}
