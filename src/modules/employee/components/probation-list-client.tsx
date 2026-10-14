"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanReview,
  batalkanReview,
  buatManual,
  generateDariProbasi,
  hapusReview,
} from "../actions/probation.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type ProbationRow = {
  id: string;
  karyawanNama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  sisaHari: number;
  status: string;
  hasil: string | null;
};

export default function ProbationListClient({
  userId,
  items,
  karyawanOptions,
}: {
  userId: string;
  items: ProbationRow[];
  karyawanOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [mulai, setMulai] = useState("");
  const [selesai, setSelesai] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuatManual() {
    if (!karyawanId || !mulai || !selesai) {
      toast.error("Karyawan dan rentang tanggal wajib diisi.");
      return;
    }
    runAction(buatManual({ karyawanId, tanggalMulai: mulai, tanggalSelesai: selesai }, userId));
  }

  function handleHapus(id: string) {
    if (!confirm("Hapus review ini?")) return;
    runAction(hapusReview(id, userId));
  }

  const kolomReview: DataTableColumn<ProbationRow>[] = [
    { id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
    {
      id: "periode",
      header: "Periode",
      sortable: false,
      searchable: false,
      render: (r) => <span>{r.tanggalMulai} – {r.tanggalSelesai}</span>,
    },
    {
      id: "sisa",
      header: "Sisa",
      headerClassName: "text-right",
      cellClassName: `text-right font-medium`,
      render: (r) => (
        <span className={r.sisaHari < 0 ? "text-red-600" : r.sisaHari <= 7 ? "text-amber-600" : ""}>
          {r.sisaHari < 0 ? `lewat ${-r.sisaHari} hari` : `${r.sisaHari} hari`}
        </span>
      ),
      sortValue: (r) => r.sisaHari,
      searchable: false,
    },
    {
      id: "hasil",
      header: "Hasil",
      render: (r) => <span>{r.hasil?.replaceAll("_", " ") ?? "-"}</span>,
      sortValue: (r) => r.hasil ?? "",
      searchValue: (r) => r.hasil?.replaceAll("_", " ") ?? "",
    },
    {
      id: "status",
      header: "Status",
      render: (r) => <span>{r.status.replaceAll("_", " ")}</span>,
      sortValue: (r) => r.status,
      searchValue: (r) => r.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (r) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Link href={`/employees/probation/${r.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {r.status === "DRAFT" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(ajukanReview(r.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {["DRAFT", "DIAJUKAN"].includes(r.status) ? (
            <button type="button" disabled={isPending} onClick={() => runAction(batalkanReview(r.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
          {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(r.status) ? (
            <button type="button" disabled={isPending} onClick={() => handleHapus(r.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Review Baru</h2>
          <button
            type="button"
            onClick={() => runAction(generateDariProbasi(userId))}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-lg border border-emerald-200 px-3 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Generate dari Karyawan Probasi
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect name="karyawan" label="Karyawan Probasi" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
          <FloatingInput name="mulai" label="Tanggal Mulai" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
          <FloatingInput name="selesai" label="Tanggal Selesai" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleBuatManual}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              Buat Draf
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomReview}
            getRowId={(r) => r.id}
            emptyMessage="Belum ada review."
          />
        </div>
      </div>
    </div>
  );
}
