import Link from "next/link";
import { verifySlip } from "@/src/modules/payroll/lib/verifikasi";

const rupiah = new Intl.NumberFormat("id-ID");

export default async function VerifySlipPage({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  const { kode } = await searchParams;
  const hasil = await verifySlip(kode ?? "");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 p-6">
      <div className="w-full rounded-2xl border border-blue-100 bg-white p-6 text-center dark:border-blue-900/60 dark:bg-slate-900">
        <p className="text-xs tracking-wide text-slate-500">VERIFIKASI SLIP HRIS</p>
        {hasil.valid ? (
          <>
            <p className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              VALID — slip asli
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Slip {hasil.kind === "GAJI" ? "Gaji" : "THR"} {hasil.period}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {hasil.employeeName} • {hasil.number}
            </p>
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {rupiah.format(Number(hasil.net))}
            </p>
            <p className="mt-1 text-xs text-slate-500">Nilai bersih tertera di slip terbitan sistem.</p>
          </>
        ) : (
          <>
            <p className="mt-3 inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
              TIDAK VALID
            </p>
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
              Kode tidak ditemukan
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Pastikan kode disalin persis dari slip (atau pindai ulang QR-nya).
            </p>
          </>
        )}
      </div>
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
        Kembali ke HRIS
      </Link>
    </main>
  );
}
