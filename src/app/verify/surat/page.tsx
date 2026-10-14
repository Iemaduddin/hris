import Link from "next/link";
import { getVerifikasiSurat } from "@/src/modules/employee/actions/surat.actions";

export default async function VerifySuratPage({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  const { kode } = await searchParams;
  const hasil = await getVerifikasiSurat(kode ?? "");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 p-6">
      <div className="w-full rounded-2xl border border-blue-100 bg-white p-6 text-center dark:border-blue-900/60 dark:bg-slate-900">
        <p className="text-xs tracking-wide text-slate-500">VERIFIKASI SURAT HRIS</p>
        {hasil.valid ? (
          <>
            <p className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              VALID — surat asli
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{hasil.nomor}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {hasil.jenis} • {hasil.karyawanNama ?? "-"} • {hasil.tanggal}
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
              TIDAK VALID
            </p>
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">Kode tidak ditemukan</h1>
          </>
        )}
      </div>
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
        Kembali ke HRIS
      </Link>
    </main>
  );
}
