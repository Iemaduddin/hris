"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import {
  bayarTunai,
  hapusReimburse,
  savePlafon,
  type ReimburseItem,
} from "../actions/reimbursement.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function ReimbursementListClient({
  userId,
  items,
  plafon,
}: {
  userId: string;
  items: ReimburseItem[];
  plafon: Array<{ kategori: string; nilai: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nilai, setNilai] = useState<Record<string, string>>(
    Object.fromEntries(plafon.map((p) => [p.kategori, p.nilai])),
  );
  const [bukti, setBukti] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBayarTunai(id: string) {
    const b = prompt("Bukti pembayaran tunai (opsional):", bukti) ?? null;
    if (b === null) return;
    setBukti(b);
    runAction(bayarTunai(id, { bukti: b }, userId));
  }

  const kolomKlaim: DataTableColumn<ReimburseItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (k) => <span><span className="font-medium">{k.nomor}</span><br /><span className="text-xs text-slate-500">{k.kategori} • {k.keterangan}</span></span>,
      sortValue: (k) => k.nomor,
      searchValue: (k) => `${k.nomor} ${k.kategori} ${k.keterangan}`,
    },
    { id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
    {
      id: "nominal",
      header: "Nominal",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (k) => <span>{rupiah.format(Number(k.nominal))}</span>,
      sortValue: (k) => Number(k.nominal),
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (k) => <span>{k.status.replaceAll("_", " ")}</span>,
      sortValue: (k) => k.status,
      searchValue: (k) => k.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (k) =>
        k.status === "DISETUJUI" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleBayarTunai(k.id)}
            className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Bayar Tunai
          </button>
        ) : ["DRAFT", "DITOLAK", "DIBATALKAN"].includes(k.status) ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => { if (!confirm("Hapus klaim ini?")) return; runAction(hapusReimburse(k.id, userId)); }}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Hapus
          </button>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Plafon per Kategori (Rp, kosong = tanpa batas)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          {plafon.map((p) => (
            <FloatingInput
              key={p.kategori}
              name={`plafon-${p.kategori}`}
              label={p.kategori}
              type="number"
              value={nilai[p.kategori] ?? ""}
              onChange={(e) => setNilai((prev) => ({ ...prev, [p.kategori]: e.currentTarget.value }))}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => runAction(savePlafon(nilai, userId))}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            Simpan Plafon
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Klaim Masuk</h2>
        <p className="mt-1 text-xs text-slate-500">
          Yang DISETUJUI ikut gaji otomatis di salary run berikutnya (TUNJANGAN, di luar bruto PPh).
        </p>
        <div className="mt-3">
          <DataTable
            data={items}
            columns={kolomKlaim}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada klaim."
          />
        </div>
      </div>
    </div>
  );
}
