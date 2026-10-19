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
} from "@/src/modules/leave/actions/leave.actions";
import {
  submitOvertime,
  cancelOvertime,
  createOvertime,
  type OvertimeItem,
} from "@/src/modules/overtime/actions/overtime.actions";
import {
  submitDuty,
  cancelDuty,
  createDuty,
  type DutyItem,
} from "@/src/modules/duty/actions/duty.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type Props = {
  employeeId: string;
  leave: LeaveRequestItem[];
  overtime: OvertimeItem[];
  duty: DutyItem[];
  leaveTypeOptions: Array<{ value: number; label: string }>;
  balance: Array<{ leaveType: string; remaining: string }>;
};

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MyRequestsClient({ employeeId, leave, overtime, duty, leaveTypeOptions, balance }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"leave" | "overtime" | "duty">("leave");

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(todayInput());
  const [endDate, setEndDate] = useState(todayInput());
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayInput());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dutyType, setDutyType] = useState("DINAS_LUAR");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");

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

  const tabs = [
    { key: "leave", label: "Cuti / Izin" },
    { key: "overtime", label: "Lembur" },
    { key: "duty", label: "Dinas / WFH" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sisa Saldo Cuti</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {balance.length === 0 ? (
            <span className="text-slate-500">Belum ada saldo tahun ini.</span>
          ) : (
            balance.map((s) => (
              <span key={s.leaveType} className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                {s.leaveType}: {s.remaining}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-blue-200 text-slate-700 hover:bg-blue-50 dark:border-blue-900/70 dark:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "leave" ? (
        <>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Ajukan Cuti / Izin</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <FloatingSelect name="leaveTypeId" label="Jenis" value={leaveTypeId} onValueChange={setLeaveTypeId} options={leaveTypeOptions.map((j) => ({ value: String(j.value), label: j.label }))} placeholder="Pilih jenis" />
              <FloatingInput name="startDate" label="Tanggal Mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
              <FloatingInput name="endDate" label="Tanggal Selesai" type="date" value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} />
              <FloatingInput name="reason" label="Alasan" value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!leaveTypeId) {
                    toast.error("Pilih jenis.");
                    return;
                  }
                  run(createLeaveRequest({ employeeId, leaveTypeId: Number(leaveTypeId), startDate, endDate, reason }));
                }}
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
              >
                Simpan Draf
              </button>
            </div>
          </div>
          <RequestsTable
            cols={["Nomor", "Jenis", "Periode", "Hari", "Status"]}
            rows={leave.map((c) => ({
              id: c.id,
              status: c.status,
              cells: [c.number, c.leaveTypeName, `${c.startDate} – ${c.endDate}`, c.totalDays, c.status.replaceAll("_", " ")],
            }))}
            isPending={isPending}
            onSubmit={(id) => run(submitLeave(id))}
            onCancel={(id) => run(cancelLeave(id, false))}
          />
        </>
      ) : null}

      {tab === "overtime" ? (
        <>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Ajukan Lembur</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <FloatingInput name="date" label="Tanggal" type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} />
              <FloatingInput name="startTime" label="Jam Mulai" type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} />
              <FloatingInput name="endTime" label="Jam Selesai" type="time" value={endTime} onChange={(e) => setEndTime(e.currentTarget.value)} />
              <FloatingInput name="overtimeReason" label="Alasan" value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!startTime || !endTime || !reason.trim()) {
                    toast.error("Lengkapi jam dan reason.");
                    return;
                  }
                  run(createOvertime({ employeeId, date, startTime, endTime, reason }));
                }}
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
              >
                Simpan Draf
              </button>
            </div>
          </div>
          <RequestsTable
            cols={["Tanggal", "Jam", "Total", "Status"]}
            rows={overtime.map((l) => ({
              id: l.id,
              status: l.status,
              cells: [l.date, `${l.startTime}–${l.endTime}`, `${l.totalHours} jam`, l.status.replaceAll("_", " ")],
            }))}
            isPending={isPending}
            submitStatuses={["DRAFT"]}
            cancelStatuses={["DRAFT", "DIAJUKAN"]}
            onSubmit={(id) => run(submitOvertime(id))}
            onCancel={(id) => run(cancelOvertime(id))}
          />
        </>
      ) : null}

      {tab === "duty" ? (
        <>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Ajukan Dinas / WFH</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <FloatingSelect name="dutyType" label="Jenis" value={dutyType} onValueChange={setDutyType} options={[{ value: "DINAS_LUAR", label: "Dinas Luar" }, { value: "WFH", label: "WFH" }]} />
              <FloatingInput name="dutyStartDate" label="Tanggal Mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
              <FloatingInput name="dutyEndDate" label="Tanggal Selesai" type="date" value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} />
              <FloatingInput name="location" label="Lokasi" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
              <FloatingInput name="purpose" label="Keperluan" value={purpose} onChange={(e) => setPurpose(e.currentTarget.value)} />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!purpose.trim()) {
                    toast.error("Isi keperluan.");
                    return;
                  }
                  run(createDuty({ employeeId, dutyType, startDate, endDate, location, purpose }));
                }}
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
              >
                Simpan Draf
              </button>
            </div>
          </div>
          <RequestsTable
            cols={["Nomor", "Jenis", "Periode", "Status"]}
            rows={duty.map((d) => ({
              id: d.id,
              status: d.status,
              cells: [d.number, d.dutyType === "DINAS_LUAR" ? "Dinas Luar" : "WFH", `${d.startDate} – ${d.endDate}`, d.status.replaceAll("_", " ")],
            }))}
            isPending={isPending}
            onSubmit={(id) => run(submitDuty(id))}
            onCancel={(id) => run(cancelDuty(id, false))}
          />
        </>
      ) : null}
    </div>
  );
}

function RequestsTable({
  cols,
  rows,
  isPending,
  onSubmit,
  onCancel,
  submitStatuses = ["DRAFT"],
  cancelStatuses = ["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL"],
}: {
  cols: string[];
  rows: Array<{ id: string; status: string; cells: string[] }>;
  isPending: boolean;
  onSubmit: (id: string) => void;
  onCancel: (id: string) => void;
  submitStatuses?: string[];
  cancelStatuses?: string[];
}) {
  type Row = { id: string; status: string; cells: string[] };
  const tableColumns: DataTableColumn<Row>[] = [
    ...cols.map(
      (c, i): DataTableColumn<Row> => ({
        id: `col-${i}`,
        header: c,
        render: (row) => <span>{row.cells[i] ?? ""}</span>,
        sortValue: (row) => row.cells[i] ?? "",
        searchValue: (row) => row.cells[i] ?? "",
      }),
    ),
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (row) => (
        <div className="inline-flex gap-2">
          {submitStatuses.includes(row.status) ? (
            <button type="button" onClick={() => onSubmit(row.id)} disabled={isPending} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {cancelStatuses.includes(row.status) ? (
            <button type="button" onClick={() => onCancel(row.id)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
        </div>
      ),
    },
  ];
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
      <div className="mt-2">
        <DataTable
          data={rows}
          columns={tableColumns}
          getRowId={(row) => row.id}
          emptyMessage="Belum ada pengajuan."
        />
      </div>
    </div>
  );
}
