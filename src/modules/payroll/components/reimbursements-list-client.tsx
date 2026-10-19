"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import {
  payCash,
  deleteReimbursement,
  saveLimits,
  type ReimbursementItem,
} from "../actions/reimbursements.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function ReimbursementListClient({
  userId,
  items,
  plafon,
}: {
  userId: string;
  items: ReimbursementItem[];
  plafon: Array<{ category: string; value: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nilai, setNilai] = useState<Record<string, string>>(
    Object.fromEntries(plafon.map((p) => [p.category, p.value])),
  );
  const [receipt, setBukti] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBayarTunai(id: string) {
    const b = prompt("receipt pembayaran tunai (opsional):", receipt) ?? null;
    if (b === null) return;
    setBukti(b);
    runAction(payCash(id, { receipt: b }, userId));
  }

  const kolomKlaim: DataTableColumn<ReimbursementItem>[] = [
    {
      id: "number",
      header: "Nomor",
      render: (k) => <span><span className="font-medium">{k.number}</span><br /><span className="text-xs text-slate-500">{k.category} • {k.description}</span></span>,
      sortValue: (k) => k.number,
      searchValue: (k) => `${k.number} ${k.category} ${k.description}`,
    },
    { id: "karyawan", header: "Employee", accessor: "employeeName" },
    {
      id: "amount",
      header: "Nominal",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (k) => <span>{rupiah.format(Number(k.amount))}</span>,
      sortValue: (k) => Number(k.amount),
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
            onClick={() => { if (!confirm("Hapus klaim ini?")) return; runAction(deleteReimbursement(k.id, userId)); }}
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Plafon per kategori (Rp, kosong = tanpa batas)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          {plafon.map((p) => (
            <FloatingInput
              key={p.category}
              name={`plafon-${p.category}`}
              label={p.category}
              type="number"
              value={nilai[p.category] ?? ""}
              onChange={(e) => setNilai((prev) => ({ ...prev, [p.category]: e.currentTarget.value }))}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => runAction(saveLimits(nilai, userId))}
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
