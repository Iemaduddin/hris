import { requireUserRole } from "@/src/lib/auth-guard";
import { getActiveEmployeeOptions, getMonthlyRecap } from "@/src/modules/recap/actions/recap.actions";
import RekapClient from "@/src/modules/recap/components/recap-client";

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; karyawanId?: string }>;
}) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const params = await searchParams;

  const now = new Date();
  let tahun = now.getFullYear();
  let bulan = now.getMonth() + 1;
  if (params.periode) {
    const [y, m] = params.periode.split("-").map(Number);
    if (y && m >= 1 && m <= 12) {
      tahun = y;
      bulan = m;
    }
  }
  const karyawanId = params.karyawanId ?? "";

  const [items, employeeOptions] = await Promise.all([
    getMonthlyRecap(tahun, bulan, karyawanId || undefined),
    getActiveEmployeeOptions(),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Rekap Kehadiran</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Hasil mesin rekap per hari. Idempoten — hitung ulang kapan pun aman.
        </p>
      </div>

      <div className="mt-5">
        <RekapClient tahun={tahun} bulan={bulan} karyawanId={karyawanId} items={items} employeeOptions={employeeOptions} />
      </div>
    </>
  );
}
