"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { processSubmissionAction, type ApprovalHistoryItem } from "../actions/approval.actions";
import type { QueueItem, ReferensiType } from "../lib/approval-engine";

const TYPE_LABEL: Record<string, string> = {
  CUTI: "Cuti/Izin",
  LEMBUR: "Lembur",
  DINAS: "Dinas/WFH",
  MUTASI: "Mutasi",
  RESIGN: "Resign",
  PROBATION: "Probation",
  TUKAR_SHIFT: "Tukar Shift",
  KOREKSI: "Koreksi Presensi",
  UPDATE_DATA: "Update Data",
  REIMBURSE: "Reimbursement",
  UANGDINAS: "Uang Dinas",
  KASBON: "Kasbon",
};

export default function ApprovalClient({
  userId,
  queue,
  history,
}: {
  userId: string;
  queue: QueueItem[];
  history: ApprovalHistoryItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  function handleProcess(type: ReferensiType, id: string, decision: "SETUJU" | "TOLAK") {
    const noteText = decision === "TOLAK" ? prompt("Alasan penolakan:") ?? "" : note;
    if (decision === "TOLAK" && !noteText) return;
    startTransition(async () => {
      const result = await processSubmissionAction(userId, type, id, decision, noteText || undefined);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setNote("");
      router.refresh();
    });
  }

  const queueColumns: DataTableColumn<QueueItem>[] = [
    {
      id: "jenis",
      header: "Jenis",
      render: (item) => <span className="font-medium">{TYPE_LABEL[item.type] ?? item.type}</span>,
      sortValue: (item) => TYPE_LABEL[item.type] ?? item.type,
      searchValue: (item) => `${TYPE_LABEL[item.type] ?? item.type} ${item.type}`,
    },
    { id: "nomor", header: "Nomor", accessor: "number" },
    {
      id: "karyawan",
      header: "Karyawan",
      render: (item) => (
        <span>
          {item.employeeName} <span className="text-xs text-slate-500">({item.employeeNumber})</span>
        </span>
      ),
      sortValue: (item) => item.employeeName,
      searchValue: (item) => `${item.employeeName} ${item.employeeNumber}`,
    },
    { id: "ringkasan", header: "Ringkasan", accessor: "summary" },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (item) => (
        <div className="inline-flex gap-2">
          <button
            type="button"
            onClick={() => handleProcess(item.type, item.id, "SETUJU")}
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Setuju
          </button>
          <button
            type="button"
            onClick={() => handleProcess(item.type, item.id, "TOLAK")}
            disabled={isPending}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Tolak
          </button>
        </div>
      ),
    },
  ];

  const historyColumns: DataTableColumn<ApprovalHistoryItem>[] = [
    {
      id: "jenis",
      header: "Jenis",
      render: (r) => <span>{TYPE_LABEL[r.type] ?? r.type}</span>,
      sortValue: (r) => TYPE_LABEL[r.type] ?? r.type,
    },
    { id: "tahap", header: "Tahap", accessor: "stage" },
    { id: "status", header: "Keputusan", accessor: "status" },
    {
      id: "waktu",
      header: "Waktu",
      render: (r) => <span>{r.processedAt ? new Date(r.processedAt).toLocaleString("id-ID") : "-"}</span>,
      sortValue: (r) => r.processedAt ?? "",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Menunggu Persetujuan ({queue.length})
        </h2>
        <div className="mt-4">
          <DataTable
            data={queue}
            columns={queueColumns}
            getRowId={(item) => `${item.type}-${item.id}`}
            emptyMessage="Tidak ada yang menunggu."
          />
        </div>
        <div className="mt-4 max-w-md">
          <FloatingInput
            name="note"
            label="Catatan persetujuan (opsional)"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Riwayat Keputusan Saya</h2>
        <div className="mt-4">
          <DataTable
            data={history}
            columns={historyColumns}
            getRowId={(r) => r.id}
            emptyMessage="Belum ada riwayat."
          />
        </div>
      </div>
    </div>
  );
}
