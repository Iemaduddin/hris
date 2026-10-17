"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  submitOffboarding,
  cancelOffboarding,
  createOffboarding,
  deleteOffboarding,
} from "../actions/offboarding.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type OffboardingRow = {
  id: string;
  employeeName: string;
  plannedDate: string;
  status: string;
  clearanceProgress: string;
};

export default function OffboardingListClient({
  userId,
  items,
  karyawanOptions,
}: {
  userId: string;
  items: OffboardingRow[];
  karyawanOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [rencana, setRencana] = useState("");
  const [alasan, setAlasan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!karyawanId || !rencana || !alasan.trim()) {
      toast.error("Karyawan, tanggal rencana, dan alasan wajib diisi.");
      return;
    }
    runAction(createOffboarding({ employeeId: karyawanId, plannedDate: rencana, reason: alasan }, userId));
  }

  function handleHapus(id: string) {
    if (!confirm("Hapus data ini?")) return;
    runAction(deleteOffboarding(id, userId));
  }

  const kolomOffboarding: DataTableColumn<OffboardingRow>[] = [
    { id: "karyawan", header: "Karyawan", accessor: "employeeName" },
    { id: "rencana", header: "Rencana", accessor: "plannedDate" },
    {
      id: "clearance",
      header: "Clearance",
      headerClassName: "text-right",
      cellClassName: "text-right",
      accessor: "clearanceProgress",
    },
    {
      id: "status",
      header: "Status",
      render: (o) => <span>{o.status.replaceAll("_", " ")}</span>,
      sortValue: (o) => o.status,
      searchValue: (o) => o.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (o) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Link href={`/employees/offboarding/${o.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {o.status === "DIAJUKAN" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(submitOffboarding(o.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(o.status) ? (
            <button type="button" disabled={isPending} onClick={() => runAction(cancelOffboarding(o.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
          {["DITOLAK", "DIBATALKAN"].includes(o.status) ? (
            <button type="button" disabled={isPending} onClick={() => handleHapus(o.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buatkan Pengajuan (HR)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="karyawan" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
          <FloatingInput name="rencana" label="Rencana Resign" type="date" value={rencana} onChange={(e) => setRencana(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat Draf
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomOffboarding}
            getRowId={(o) => o.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>
    </div>
  );
}
