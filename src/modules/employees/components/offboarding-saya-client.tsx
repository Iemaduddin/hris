"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { submitOffboarding, cancelOffboarding, createOffboarding } from "@/src/modules/employees/actions/offboarding.actions";

type OffboardingSayaRow = { id: string; plannedDate: string; status: string; paklaringNumber: string | null };

export default function OffboardingSayaClient({
  userId,
  employeeId,
  items,
}: {
  userId: string;
  employeeId: string;
  items: OffboardingSayaRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rencana, setRencana] = useState("");
  const [reason, setAlasan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!rencana || !reason.trim()) {
      toast.error("Tanggal rencana dan reason wajib diisi.");
      return;
    }
    startTransition(async () => {
      const buat = await createOffboarding({ employeeId, plannedDate: rencana, reason: reason }, userId);
      if (!buat.success) {
        toast.error(buat.message);
        return;
      }
      toast.success(buat.message);
      setAlasan("");
      router.refresh();
    });
  }

  const kolomRiwayat: DataTableColumn<OffboardingSayaRow>[] = [
    {
      id: "rencana",
      header: "Rencana",
      render: (o) => <span className="font-medium">{o.plannedDate}</span>,
      sortValue: (o) => o.plannedDate,
      searchValue: (o) => o.plannedDate,
    },
    {
      id: "status",
      header: "Status",
      render: (o) => <span>{o.status.replaceAll("_", " ")}</span>,
      sortValue: (o) => o.status,
      searchValue: (o) => o.status.replaceAll("_", " "),
    },
    {
      id: "paklaring",
      header: "Paklaring",
      render: (o) => <span>{o.paklaringNumber ?? "-"}</span>,
      sortValue: (o) => o.paklaringNumber ?? "-",
      searchValue: (o) => o.paklaringNumber ?? "",
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (o) => (
        <div className="inline-flex gap-2">
          {o.status === "DIAJUKAN" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(submitOffboarding(o.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(o.status) ? (
            <button type="button" disabled={isPending} onClick={() => runAction(cancelOffboarding(o.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batalkan
            </button>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Resign</h2>
        <p className="mt-1 text-xs text-slate-500">
          Diajukan ke atasan langsung lalu HR. Setelah disetujui ada tahap clearance sebelum efektif.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingInput name="rencana" label="Rencana Tanggal Resign" type="date" value={rencana} onChange={(e) => setRencana(e.currentTarget.value)} />
          <FloatingInput name="reason" label="Alasan" value={reason} onChange={(e) => setAlasan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat Draf
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomRiwayat}
            getRowId={(o) => o.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>
    </div>
  );
}
