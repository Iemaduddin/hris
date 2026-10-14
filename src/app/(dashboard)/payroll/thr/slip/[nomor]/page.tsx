import { notFound } from "next/navigation";
import { requireUserRole } from "@/src/lib/auth-guard";
import { getThrSlip } from "@/src/modules/payroll/actions/thr.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default async function ThrSlipPage({ params }: { params: Promise<{ nomor: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const { nomor } = await params;
  const slip = await getThrSlip(decodeURIComponent(nomor));
  if (!slip) notFound();

  return (
    <>
		<div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Slip THR {slip.namaHariRaya} {slip.tahun}</h1>
					<p className="mt-2 text-sm text-slate-500">
						{slip.karyawanNama} ({slip.nomorKaryawan}) • {slip.nomor} • Masa kerja {slip.masaKerjaBulan} bulan
					</p>
				</div>
				<a href={`/api/payroll/thr-slip/${encodeURIComponent(slip.nomor)}`} className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">
					Unduh PDF
				</a>
			</div>
        <p className="mt-1 text-xs text-slate-500">
          Hari raya {slip.tanggalHariRaya} • Dibayar {slip.tanggalBayar}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="space-y-2 text-sm">
          {slip.rincian.map((r) => (
            <li key={r.kode} className="flex justify-between gap-4">
              <span>
                {r.nama} {r.keterangan ? <span className="text-xs text-slate-500">({r.keterangan})</span> : null}
              </span>
              <span className={`font-medium ${r.kelompok === "POTONGAN" || r.kelompok === "IURAN" ? "text-red-600" : ""}`}>
                {rupiah.format(r.jumlah)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">THR Bersih</span>
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">
            {rupiah.format(Number(slip.bersih))}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Upah sebulan {rupiah.format(Number(slip.upahSebulan))} • Bruto {rupiah.format(Number(slip.bruto))} • PPh 21 {rupiah.format(Number(slip.pph21))}
        </p>
      </div>
    </>
  );
}
