import { requireUserRole } from "@/src/lib/auth-guard";
import { getThrRuns } from "@/src/modules/payroll/actions/thr.actions";
import ThrListClient from "@/src/modules/payroll/components/thr-list-client";

export default async function ThrPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const runs = await getThrRuns();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">THR Keagamaan</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Run khusus terpisah dari salary run: hitung → finalisasi (kunci) → terbitkan slip THR. PPh 21 dihitung marginal TER terhadap gaji bulan pembayaran.
        </p>
      </div>

      <div className="mt-5">
        <ThrListClient runs={runs} />
      </div>
    </>
  );
}
