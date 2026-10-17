"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import {
  deleteCalendarAssignment,
  deleteRoster,
  saveCalendarAssignment,
  saveRosterPattern,
  type CalendarAssignmentItem,
  type RosterListItem,
} from "../actions/roster.actions";

type RosterClientProps = {
  start: string;
  end: string;
  roster: RosterListItem[];
  assignments: CalendarAssignmentItem[];
  employeeOptions: Array<{ value: string; label: string }>;
  shiftOptions: Array<{ value: string; label: string }>;
  calendarOptions: Array<{ value: number; label: string }>;
};

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RosterClient({
  start,
  end,
  roster,
  assignments,
  employeeOptions,
  shiftOptions,
  calendarOptions,
}: RosterClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<string[]>([]);
  const [pattern, setPattern] = useState("");
  const [assignEmployee, setAssignEmployee] = useState("");
  const [assignCalendar, setAssignCalendar] = useState("");
  const [assignStart, setAssignStart] = useState(todayInput());
  const [assignEnd, setAssignEnd] = useState("");

  const shiftCodeToId = new Map(
    shiftOptions.map((o) => [o.label.split(" — ")[0].trim().toUpperCase(), o.value] as const),
  );

  function toggleCheck(id: string) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function applyPeriod(nextStart: string, nextEnd: string) {
    const params = new URLSearchParams();
    if (nextStart) params.set("start", nextStart);
    if (nextEnd) params.set("end", nextEnd);
    router.push(`/roster?${params.toString()}`);
  }

  function handleSaveRoster() {
    const codeList = pattern.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const ids = codeList.map((k) => shiftCodeToId.get(k)).filter((x): x is string => Boolean(x));
    if (checked.length === 0) {
      toast.error("Pilih minimal satu karyawan.");
      return;
    }
    if (ids.length === 0) {
      toast.error("Pola tidak valid. Contoh: PAGI,SIANG,MALAM (pakai kode shift).");
      return;
    }
    startTransition(async () => {
      const result = await saveRosterPattern({ employeeIds: checked, start, end, patternShiftIds: ids });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleDeleteRoster() {
    if (checked.length === 0) {
      toast.error("Pilih minimal satu karyawan.");
      return;
    }
    if (!confirm(`Hapus roster periode ${start}–${end} untuk ${checked.length} karyawan?`)) return;
    startTransition(async () => {
      const result = await deleteRoster({ employeeIds: checked, start, end });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleSaveAssignment() {
    if (!assignEmployee || !assignCalendar || !assignStart) {
      toast.error("Karyawan, kalender, dan tanggal mulai wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await saveCalendarAssignment({
        employeeId: assignEmployee,
        calendarId: Number(assignCalendar),
        startDate: assignStart,
        endDate: assignEnd || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function handleDeleteAssignment(id: number) {
    if (!confirm("Hapus penugasan ini?")) return;
    startTransition(async () => {
      const result = await deleteCalendarAssignment(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const assignmentColumns: DataTableColumn<CalendarAssignmentItem>[] = [
    { id: "karyawan", header: "Karyawan", accessor: "employeeName" },
    { id: "kalender", header: "Kalender", accessor: "calendarName" },
    {
      id: "periode",
      header: "Periode",
      render: (p) => <span>{p.startDate} – {p.endDate ?? "…"}</span>,
      sortValue: (p) => p.startDate,
      searchValue: (p) => `${p.startDate} ${p.endDate ?? ""}`,
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (p) => (
        <button
          type="button"
          onClick={() => handleDeleteAssignment(p.id)}
          disabled={isPending}
          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Hapus
        </button>
      ),
    },
  ];

  const rosterColumns: DataTableColumn<RosterListItem>[] = [
    { id: "tanggal", header: "Tanggal", accessor: "date" },
    {
      id: "karyawan",
      header: "Karyawan",
      render: (r) => (
        <span>
          {r.employeeName} <span className="text-xs text-slate-500">({r.employeeNumber})</span>
        </span>
      ),
      sortValue: (r) => r.employeeName,
      searchValue: (r) => `${r.employeeName} ${r.employeeNumber}`,
    },
    {
      id: "shift",
      header: "Shift",
      render: (r) => (
        <span className="font-medium">
          {r.shiftCode} <span className="font-normal text-slate-500">({r.shiftName})</span>
        </span>
      ),
      sortValue: (r) => r.shiftCode,
      searchValue: (r) => `${r.shiftCode} ${r.shiftName}`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Penugasan Kalender</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Untuk pola kantor/reguler. Penugasan baru menutup yang terbuka sebelumnya.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect
            name="assignEmployee"
            label="Karyawan"
            value={assignEmployee}
            onValueChange={setAssignEmployee}
            options={employeeOptions}
            placeholder="Pilih karyawan"
            searchable
          />
          <FloatingSelect
            name="assignCalendar"
            label="Kalender"
            value={assignCalendar}
            onValueChange={setAssignCalendar}
            options={calendarOptions.map((k) => ({ value: String(k.value), label: k.label }))}
            placeholder="Pilih kalender"
          />
          <FloatingInput name="assignStart" label="Tanggal Mulai" type="date" value={assignStart} onChange={(e) => setAssignStart(e.currentTarget.value)} />
          <FloatingInput name="assignEnd" label="Tanggal Selesai (opsional)" type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAssignment}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            Simpan Penugasan
          </button>
        </div>
        <div className="mt-4">
          <DataTable
            data={assignments}
            columns={assignmentColumns}
            getRowId={(p) => String(p.id)}
            emptyMessage="Belum ada penugasan kalender."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Roster Shift</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pola rotasi dari kode shift, diputar per hari. Contoh pola: PAGI,SIANG,MALAM.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingInput name="start" label="Mulai" type="date" value={start} onChange={(e) => applyPeriod(e.currentTarget.value, end)} />
          <FloatingInput name="end" label="Selesai" type="date" value={end} onChange={(e) => applyPeriod(start, e.currentTarget.value)} />
          <div className="md:col-span-2">
            <FloatingInput
              name="pattern"
              label="Pola Shift (kode, pisahkan koma)"
              value={pattern}
              onChange={(e) => setPattern(e.currentTarget.value.toUpperCase())}
              placeholder="PAGI,SIANG,MALAM"
            />
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Karyawan ({checked.length} dipilih)</p>
          <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-blue-100 p-3 md:grid-cols-3 dark:border-blue-900/60">
            {employeeOptions.map((k) => (
              <label key={k.value} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={checked.includes(k.value)} onChange={() => toggleCheck(k.value)} className="h-4 w-4" />
                <span className="truncate">{k.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDeleteRoster}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-70"
          >
            Hapus Periode
          </button>
          <button
            type="button"
            onClick={handleSaveRoster}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {isPending ? "Menyimpan..." : "Simpan Roster"}
          </button>
        </div>
        <div className="mt-4">
          <DataTable
            data={roster}
            columns={rosterColumns}
            getRowId={(r) => String(r.id)}
            emptyMessage="Belum ada roster pada periode ini."
          />
        </div>
      </div>
    </div>
  );
}
