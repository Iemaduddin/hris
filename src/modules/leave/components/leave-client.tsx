"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  submitLeave,
  cancelLeave,
  createLeaveRequest,
  type LeaveRequestItem,
  type LeaveBalanceItem,
} from "../actions/leave.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type LeaveClientProps = {
  items: LeaveRequestItem[];
  balance: LeaveBalanceItem[];
  year: number;
  employeeOptions: Array<{ value: string; label: string }>;
  leaveTypeOptions: Array<{ value: number; label: string; requiresAttachment: boolean }>;
};

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LeaveClient({ items, balance, year, employeeOptions, leaveTypeOptions }: LeaveClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(todayInput());
  const [endDate, setEndDate] = useState(todayInput());
  const [reason, setReason] = useState("");

  function run(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleCreate() {
    if (!employeeId || !leaveTypeId) {
      toast.error("Pilih karyawan dan jenis.");
      return;
    }
    run(
      createLeaveRequest({
        employeeId,
        leaveTypeId: Number(leaveTypeId),
        startDate,
        endDate,
        reason,
      }),
    );
  }

  const requestColumns: DataTableColumn<LeaveRequestItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (item) => <span className="font-medium">{item.number}</span>,
      sortValue: (item) => item.number,
      searchValue: (item) => item.number,
    },
    { id: "karyawan", header: "Employee", accessor: "employeeName" },
    { id: "jenis", header: "Jenis", accessor: "leaveTypeName" },
    {
      id: "periode",
      header: "Periode",
      sortable: false,
      searchable: false,
      render: (item) => <span>{item.startDate} – {item.endDate}</span>,
    },
    {
      id: "totalDays",
      header: "Hari",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (item) => <span>{item.totalDays}</span>,
      sortValue: (item) => item.totalDays,
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (item) => <span>{item.status.replaceAll("_", " ")}</span>,
      sortValue: (item) => item.status,
      searchValue: (item) => item.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (item) => (
        <div className="inline-flex gap-2">
          {item.status === "DRAFT" ? (
            <button type="button" onClick={() => run(submitLeave(item.id))} disabled={isPending} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"].includes(item.status) ? (
            <button type="button" onClick={() => run(cancelLeave(item.id, true))} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const balanceColumns: DataTableColumn<LeaveBalanceItem>[] = [
    { id: "karyawan", header: "Employee", accessor: "employeeName" },
    { id: "jenis", header: "Jenis", accessor: "leaveTypeName" },
    {
      id: "openingBalance",
      header: "Awal",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (s) => <span>{s.openingBalance}</span>,
      sortValue: (s) => s.openingBalance,
      searchable: false,
    },
    {
      id: "closingBalance",
      header: "Sisa",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold",
      render: (s) => <span>{s.closingBalance}</span>,
      sortValue: (s) => s.closingBalance,
      searchable: false,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Pengajuan</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="employeeId" label="Employee" value={employeeId} onValueChange={setEmployeeId} options={employeeOptions} placeholder="Pilih karyawan" searchable />
          <FloatingSelect name="leaveTypeId" label="Jenis" value={leaveTypeId} onValueChange={setLeaveTypeId} options={leaveTypeOptions.map((j) => ({ value: String(j.value), label: j.label }))} placeholder="Pilih jenis" />
          <FloatingInput name="startDate" label="Tanggal Mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
          <FloatingInput name="endDate" label="Tanggal Selesai" type="date" value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} />
          <FloatingInput name="reason" label="Alasan" value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleCreate} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Simpan Draf
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pengajuan</h2>
        <div className="mt-4">
          <DataTable
            data={items}
            columns={requestColumns}
            getRowId={(item) => item.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Saldo {year}</h2>
        <div className="mt-4">
          <DataTable
            data={balance}
            columns={balanceColumns}
            getRowId={(s) => String(s.id)}
            emptyMessage="Belum ada saldo. Generate di Pengaturan → Jenis Ketidakhadiran."
          />
        </div>
      </div>
    </div>
  );
}
