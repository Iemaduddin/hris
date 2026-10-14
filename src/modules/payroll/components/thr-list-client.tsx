"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { buatThrRun, hapusThrRun, type ThrRunItem } from "../actions/thr.actions";

const rupiah = new Intl.NumberFormat("id-ID");

const HARI_RAYA_OPSI = ["Idul Fitri", "Idul Adha", "Natal", "Nyepi", "Waisak", "Imlek"];

export default function ThrListClient({ runs }: { runs: ThrRunItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [nama, setNama] = useState(HARI_RAYA_OPSI[0]);
  const [tglRaya, setTglRaya] = useState("");
  const [tglBayar, setTglBayar] = useState("");

  function handleBuat() {
    if (!tglRaya || !tglBayar) {
      toast.error("Tanggal hari raya dan tanggal bayar wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await buatThrRun({
        tahun: Number(tahun),
        namaHariRaya: nama,
        tanggalHariRaya: tglRaya,
        tanggalBayar: tglBayar,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleHapus(id: string) {
    if (!confirm("Hapus THR run ini?")) return;
    startTransition(async () => {
      const result = await hapusThrRun(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const kolomThr: DataTableColumn<ThrRunItem>[] = [
    {
      id: "thr",
      header: "THR",
      render: (r) => <span className="font-medium">{r.namaHariRaya} {r.tahun}</span>,
      sortValue: (r) => `${r.tahun} ${r.namaHariRaya}`,
      searchValue: (r) => `${r.namaHariRaya} ${r.tahun}`,
    },
    { id: "hariRaya", header: "Hari Raya", accessor: "tanggalHariRaya" },
    {
      id: "bayar",
      header: "Bayar",
      render: (r) => (
        <span>
          {r.tanggalBayar}
          {r.terlambat ? (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">lewat H-7</span>
          ) : null}
        </span>
      ),
      sortValue: (r) => r.tanggalBayar,
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (r) => <span>{r.status.replaceAll("_", " ")}</span>,
      sortValue: (r) => r.status,
      searchValue: (r) => r.status.replaceAll("_", " "),
    },
    {
      id: "jumlahKaryawan",
      header: "Karyawan",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (r) => <span>{r.jumlahKaryawan}</span>,
      sortValue: (r) => r.jumlahKaryawan,
      searchable: false,
    },
    {
      id: "totalBersih",
      header: "Total Bersih",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (r) => <span>{rupiah.format(Number(r.totalBersih))}</span>,
      sortValue: (r) => Number(r.totalBersih),
      searchable: false,
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (r) => (
        <div className="inline-flex gap-2">
          <Link href={`/payroll/thr/${r.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {["DRAF", "DIHITUNG"].includes(r.status) ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleHapus(r.id)}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Hapus
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat THR Baru</h2>
        <p className="mt-1 text-xs text-slate-500">
          Nominal: ≥12 bulan masa kerja → 1x upah (gapok + tunjangan tetap); &lt;12 bulan → prorata. Bayar paling lambat H-7 (denda 5% bila telat).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <FloatingInput name="tahun" label="Tahun" value={tahun} onChange={(e) => setTahun(e.currentTarget.value)} />
          <div className="flex flex-col gap-1">
            <label htmlFor="thr-nama" className="text-xs font-medium text-slate-500">Hari Raya</label>
            <select
              id="thr-nama"
              value={nama}
              onChange={(e) => setNama(e.currentTarget.value)}
              className="h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm dark:border-blue-900/60 dark:bg-slate-900"
            >
              {HARI_RAYA_OPSI.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <FloatingInput name="tglRaya" label="Tanggal Hari Raya" type="date" value={tglRaya} onChange={(e) => setTglRaya(e.currentTarget.value)} />
          <FloatingInput name="tglBayar" label="Tanggal Bayar" type="date" value={tglBayar} onChange={(e) => setTglBayar(e.currentTarget.value)} />
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat THR
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={runs}
            columns={kolomThr}
            getRowId={(r) => r.id}
            emptyMessage="Belum ada THR run."
          />
        </div>
      </div>
    </div>
  );
}
