"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { submitDuty, cancelDuty, createDuty, type DutyItem } from "../actions/duty.actions";

const DUTY_TYPE_OPTIONS = [
  { value: "DINAS_LUAR", label: "Dinas Luar" },
  { value: "WFH", label: "WFH" },
];

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DinasClient({
  items,
  employeeOptions,
}: {
  items: DutyItem[];
  employeeOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [dutyType, setDutyType] = useState("DINAS_LUAR");
  const [startDate, setStartDate] = useState(todayInput());
  const [endDate, setEndDate] = useState(todayInput());
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

  const dutyColumns: DataTableColumn<DutyItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (item) => <span className="font-medium">{item.number}</span>,
      sortValue: (item) => item.number,
      searchValue: (item) => item.number,
    },
    { id: "karyawan", header: "Karyawan", accessor: "employeeName" },
    {
      id: "jenis",
      header: "Jenis",
      render: (item) => <span>{item.dutyType === "DINAS_LUAR" ? "Dinas Luar" : "WFH"}</span>,
      sortValue: (item) => item.dutyType,
      searchValue: (item) => (item.dutyType === "DINAS_LUAR" ? "Dinas Luar" : "WFH"),
    },
    {
      id: "periode",
      header: "Periode",
      sortable: false,
      searchable: false,
      render: (item) => <span>{item.startDate} – {item.endDate}</span>,
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
            <button type="button" onClick={() => run(submitDuty(item.id))} disabled={isPending} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {["DRAFT", "DIAJUKAN", "MENUNGGU_APPROVAL", "DISETUJUI"].includes(item.status) ? (
            <button type="button" onClick={() => run(cancelDuty(item.id, true))} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Pengajuan</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="employeeId" label="Karyawan" value={employeeId} onValueChange={setEmployeeId} options={employeeOptions} placeholder="Pilih karyawan" searchable />
          <FloatingSelect name="dutyType" label="Jenis" value={dutyType} onValueChange={setDutyType} options={DUTY_TYPE_OPTIONS} />
          <FloatingInput name="startDate" label="Tanggal Mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
          <FloatingInput name="endDate" label="Tanggal Selesai" type="date" value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} />
          <FloatingInput name="location" label="Lokasi" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
          <FloatingInput name="purpose" label="Keperluan" value={purpose} onChange={(e) => setPurpose(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!employeeId || !purpose.trim()) {
                toast.error("Lengkapi karyawan dan keperluan.");
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

    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={dutyColumns}
            getRowId={(item) => item.id}
            emptyMessage="Belum ada pengajuan dinas/WFH."
          />
        </div>
      </div>
    </div>
  );
}
