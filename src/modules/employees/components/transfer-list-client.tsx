"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  submitTransfer,
  cancelTransfer,
  createMutasi,
  deleteTransfer,
  type TransferItem,
  type TransferOption,
} from "../actions/transfers.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const JENIS_OPTIONS = [
  { value: "MUTASI", label: "Mutasi (lateral)" },
  { value: "PROMOSI", label: "Promosi" },
  { value: "DEMOSI", label: "Demosi" },
];

export default function TransferListClient({
  userId,
  items,
  options,
}: {
  userId: string;
  items: TransferItem[];
  options: {
    karyawan: TransferOption[];
    units: TransferOption[];
    positions: TransferOption[];
    locations: TransferOption[];
    atasan: TransferOption[];
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [jenis, setJenis] = useState("MUTASI");
  const [keUnit, setKeUnit] = useState("");
  const [kePosisi, setKePosisi] = useState("");
  const [keLokasi, setKeLokasi] = useState("");
  const [keAtasan, setKeAtasan] = useState("");
  const [efektif, setEfektif] = useState("");
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
    if (!karyawanId || !efektif || !reason.trim()) {
      toast.error("Employee, tanggal efektif, dan reason wajib diisi.");
      return;
    }
    if (!keUnit && !kePosisi && !keLokasi) {
      toast.error("Isi minimal satu tujuan (unit/posisi/lokasi).");
      return;
    }
    runAction(
      createMutasi(
        {
          employeeId: karyawanId,
          kind: jenis,
          toUnitId: keUnit,
          toPositionId: kePosisi,
          toWorkLocationId: keLokasi,
          toSupervisorId: keAtasan,
          effectiveDate: efektif,
          reason: reason,
        },
        userId,
      ),
    );
  }

  const transferColumns: DataTableColumn<TransferItem>[] = [
    {
      id: "number",
      header: "Nomor",
      render: (m) => <span className="font-medium">{m.number}</span>,
      sortValue: (m) => m.number,
      searchValue: (m) => m.number,
    },
    { id: "karyawan", header: "Employee", accessor: "employeeName" },
    { id: "jenis", header: "Jenis", accessor: "kindLabel" },
    {
      id: "rute",
      header: "Dari → Ke",
      sortable: false,
      searchValue: (m) => `${m.from} ${m.to}`,
      render: (m) => <span className="text-xs">{m.from} → {m.to}</span>,
    },
    { id: "efektif", header: "Efektif", accessor: "effectiveDate" },
    {
      id: "status",
      header: "Status",
      render: (m) => <span>{m.status.replaceAll("_", " ")}</span>,
      sortValue: (m) => m.status,
      searchValue: (m) => m.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (m) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Link href={`/employees/transfers/${m.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {m.status === "DRAFT" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(submitTransfer(m.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {["DRAFT", "DIAJUKAN"].includes(m.status) ? (
            <button type="button" disabled={isPending} onClick={() => runAction(cancelTransfer(m.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
          {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(m.status) ? (
            <button type="button" disabled={isPending} onClick={() => { if (!confirm("Hapus usulan ini?")) return; runAction(deleteTransfer(m.id, userId)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usulkan Mutasi / Promosi / Demosi</h2>
        <p className="mt-1 text-xs text-slate-500">
          Draf → diajukan ke atasan langsung karyawan → HR → diterapkan HR (riwayat penempatan append-only).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="karyawan" label="Employee" value={karyawanId} onValueChange={setKaryawanId} options={options.karyawan} placeholder="Pilih karyawan" searchable />
          <FloatingSelect name="jenis" label="Jenis" value={jenis} onValueChange={setJenis} options={JENIS_OPTIONS} searchable={false} />
          <FloatingInput name="efektif" label="Tanggal Efektif" type="date" value={efektif} onChange={(e) => setEfektif(e.currentTarget.value)} />
          <FloatingSelect name="keUnit" label="Unit Tujuan" value={keUnit} onValueChange={setKeUnit} options={options.units} placeholder="Tetap" searchable />
          <FloatingSelect name="kePosisi" label="Posisi Tujuan" value={kePosisi} onValueChange={setKePosisi} options={options.positions} placeholder="Tetap" searchable />
          <FloatingSelect name="keLokasi" label="Lokasi Tujuan" value={keLokasi} onValueChange={setKeLokasi} options={options.locations} placeholder="Tetap" searchable />
          <FloatingSelect name="keAtasan" label="Atasan Baru (opsional)" value={keAtasan} onValueChange={setKeAtasan} options={options.atasan} placeholder="Tetap" searchable />
          <FloatingInput name="reason" label="Alasan" value={reason} onChange={(e) => setAlasan(e.currentTarget.value)} />
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
            columns={transferColumns}
            getRowId={(m) => m.id}
            emptyMessage="Belum ada usulan."
          />
        </div>
      </div>
    </div>
  );
}
