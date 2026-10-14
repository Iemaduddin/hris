import { notFound } from "next/navigation";
import { requireUserRole } from "@/src/lib/auth-guard";
import { getDisburseThrRun, getThrDetail } from "@/src/modules/payroll/actions/thr.actions";
import ThrDetailClient from "@/src/modules/payroll/components/thr-detail-client";

export default async function ThrRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const { id } = await params;
  const [{ run, detail }, disburse] = await Promise.all([getThrDetail(id), getDisburseThrRun(id)]);
  if (!run) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">THR {run.namaHariRaya} {run.tahun}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Detail perhitungan per karyawan (upah = gapok + tunjangan tetap).
        </p>
      </div>

      {disburse && disburse.belum.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {disburse.belum.length} karyawan tanpa data bank lengkap — tidak ikut file CSV transfer:
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{disburse.belum.join("; ")}</p>
        </div>
      ) : null}

      <div className="mt-5">
        <ThrDetailClient run={run} detail={detail} />
      </div>
    </>
  );
}
