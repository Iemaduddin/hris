"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { recordAttendance, type AttendanceListItem } from "../actions/attendance.actions";

const EVENT_TYPE_OPTIONS = [
  { value: "MASUK", label: "Masuk" },
  { value: "KELUAR", label: "Keluar" },
  { value: "MULAI_ISTIRAHAT", label: "Mulai Istirahat" },
  { value: "SELESAI_ISTIRAHAT", label: "Selesai Istirahat" },
  { value: "KELUAR_KANTOR", label: "Keluar Kantor" },
  { value: "KEMBALI_KANTOR", label: "Kembali Kantor" },
];

type AttendanceClientProps = {
  date: string;
  items: AttendanceListItem[];
  employeeOptions: Array<{ value: string; label: string }>;
};

const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function AttendanceClient({ date, items, employeeOptions }: AttendanceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [eventType, setEventType] = useState("MASUK");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  function handleRecord() {
    if (!employeeId) {
      toast.error("Pilih karyawan.");
      return;
    }
    startTransition(async () => {
      const result = await recordAttendance({ employeeId, eventType, time: time || undefined, note });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setNote("");
      setTime("");
      router.refresh();
    });
  }

  function handleCorrection() {
    toast.info("Koreksi langsung ditutup. Ajukan via Koreksi Presensi — diproses atasan → HR.");
  }

  const attendanceColumns: DataTableColumn<AttendanceListItem>[] = [
    {
      id: "waktu",
      header: "Waktu",
      render: (item) => <span>{timeFormatter.format(new Date(item.time))}</span>,
      sortValue: (item) => item.time,
      searchable: false,
    },
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
    {
      id: "tipe",
      header: "Tipe",
      render: (item) => <span>{item.eventType.replaceAll("_", " ")}</span>,
      sortValue: (item) => item.eventType,
      searchValue: (item) => item.eventType.replaceAll("_", " "),
    },
    { id: "sumber", header: "Sumber", accessor: "source" },
    { id: "status", header: "Status", accessor: "status" },
    {
      id: "penanda",
      header: "Penanda",
      sortable: false,
      searchable: false,
      render: (item) => (
        <div className="flex flex-wrap items-center gap-1">
          {item.terlambatKirim ? (
            <span
              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              title="Perangkat mengirim presensi dari antrean offline, jadi waktu event berasal dari perangkat."
            >
              Terlambat kirim
            </span>
          ) : null}
          {item.isOutsideRadius ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Luar radius
            </span>
          ) : null}
          {item.isMocked ? (
            <span
              className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
              title="Perangkat melaporkan/dicurigai lokasi simulasi (mock)."
            >
              Lokasi dicurigai
            </span>
          ) : null}
          {!item.terlambatKirim && !item.isOutsideRadius && !item.isMocked ? (
            <span className="text-xs text-slate-400">—</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (item) =>
        item.status === "VALID" ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Via pengajuan</span>
            <Link
              href="/account/koreksi"
              onClick={handleCorrection}
              className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50"
            >
              Koreksi via Approval
            </Link>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{item.note ?? "-"}</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <FloatingInput
          name="filterTanggal"
          label="Tanggal"
          type="date"
          value={date}
          onChange={(e) => {
            if (e.currentTarget.value) router.push(`/attendance?tanggal=${e.currentTarget.value}`);
          }}
        />
      </div>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Catat Manual</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect
            name="employeeId"
            label="Karyawan"
            value={employeeId}
            onValueChange={setEmployeeId}
            options={employeeOptions}
            placeholder="Pilih karyawan"
            searchable
          />
          <FloatingSelect
            name="eventType"
            label="Tipe"
            value={eventType}
            onValueChange={setEventType}
            options={EVENT_TYPE_OPTIONS}
          />
          <FloatingInput
            name="time"
            label="Waktu (kosongkan = sekarang)"
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.currentTarget.value)}
          />
          <FloatingInput
            name="note"
            label="Catatan"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleRecord}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {isPending ? "Menyimpan..." : "Catat Presensi"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Log {date}</h2>
        <div className="mt-4">
          <DataTable
            data={items}
            columns={attendanceColumns}
            getRowId={(item) => item.id}
            emptyMessage="Belum ada presensi pada tanggal ini."
          />
        </div>
      </div>
    </div>
  );
}
