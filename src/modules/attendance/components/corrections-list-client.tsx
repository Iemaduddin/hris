"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { submitCorrection, cancelCorrection, createCorrection, type CorrectionItem } from "@/src/modules/attendance/actions/corrections.actions";

const EVENT_TYPE_OPTIONS = [
  { value: "MASUK", label: "Masuk" },
  { value: "KELUAR", label: "Keluar" },
  { value: "MULAI_ISTIRAHAT", label: "Mulai Istirahat" },
  { value: "SELESAI_ISTIRAHAT", label: "Selesai Istirahat" },
  { value: "KELUAR_KANTOR", label: "Keluar Kantor" },
  { value: "KEMBALI_KANTOR", label: "Kembali Kantor" },
];

export default function KoreksiListClient({
  userId,
  items,
}: {
  userId: string;
  items: CorrectionItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [eventType, setEventType] = useState("MASUK");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function validateForm() {
    if (!date || !time || !reason.trim()) {
      toast.error("Tanggal, jam, dan reason wajib diisi.");
      return false;
    }
    return true;
  }

  function createDraft() {
    if (!validateForm()) return;
    runAction(createCorrection({ date, eventType, time, reason, attachmentUrl: attachment }, userId));
  }

  function createAndSubmit() {
    if (!validateForm()) return;
    startTransition(async () => {
      const created = await createCorrection({ date, eventType, time, reason, attachmentUrl: attachment }, userId);
      if (!created.success || !created.id) {
        toast.error(created.message);
        return;
      }

      const submitted = await submitCorrection(created.id, userId);
      if (!submitted.success) {
        toast.error(submitted.message);
        router.refresh();
        return;
      }

      toast.success(submitted.message);
      router.refresh();
    });
  }

  const correctionColumns: DataTableColumn<CorrectionItem>[] = [
    {
      id: "tanggal",
      header: "Tanggal",
      render: (k) => <span className="font-medium">{k.date}</span>,
      sortValue: (k) => k.date,
      searchValue: (k) => k.date,
    },
    {
      id: "tipe",
      header: "Tipe",
      render: (k) => <span>{k.eventType.replaceAll("_", " ")}</span>,
      sortValue: (k) => k.eventType,
      searchValue: (k) => k.eventType.replaceAll("_", " "),
    },
    { id: "correctedTime", header: "Jam Benar", accessor: "correctedTime" },
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
        k.status === "DRAFT" ? (
          <button type="button" disabled={isPending} onClick={() => runAction(submitCorrection(k.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
            Ajukan
          </button>
        ) : ["DRAFT", "DIAJUKAN"].includes(k.status) ? (
          <button type="button" disabled={isPending} onClick={() => runAction(cancelCorrection(k.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
            Batalkan
          </button>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Koreksi</h2>
        <p className="mt-1 text-xs text-slate-500">
          Lupa/telat clock-in? Usulkan jam yang benar + bukti — diproses atasan lalu HR.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingInput name="date" label="Tanggal" type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} />
          <FloatingSelect name="eventType" label="Tipe" value={eventType} onValueChange={setEventType} options={EVENT_TYPE_OPTIONS} searchable={false} />
          <FloatingInput name="time" label="Jam Seharusnya (HH:MM)" type="time" value={time} onChange={(e) => setTime(e.currentTarget.value)} />
          <FloatingInput name="reason" label="Alasan" value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
          <FloatingInput name="attachment" label="URL Bukti (opsional)" value={attachment} onChange={(e) => setAttachment(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={createDraft}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            Buat Draf
          </button>
          <button
            type="button"
            onClick={createAndSubmit}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            Buat & Ajukan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={correctionColumns}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>
    </div>
  );
}
