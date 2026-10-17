"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  createDisiplin,
  deleteDisiplin,
  publishDisiplin,
} from "../actions/disiplin.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type DisiplinRow = {
  id: string;
  number: string;
  employeeName: string;
  levelLabel: string;
  title: string;
  publishedAt: string;
  active: boolean;
  status: string;
};

const TINGKAT_OPTIONS = [
  { value: "SP1", label: "SP 1" },
  { value: "SP2", label: "SP 2" },
  { value: "SP3", label: "SP 3" },
  { value: "SKORSING", label: "Skorsing" },
  { value: "PHK", label: "PHK" },
];

export default function DisiplinListClient({
  userId,
  items,
  karyawanOptions,
  bolehTerbit,
}: {
  userId: string;
  items: DisiplinRow[];
  karyawanOptions: Array<{ value: string; label: string }>;
  bolehTerbit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [tingkat, setTingkat] = useState("SP1");
  const [judul, setJudul] = useState("");
  const [pelanggaran, setPelanggaran] = useState("");
  const [berat, setBerat] = useState(false);
  const [terbit, setTerbit] = useState("");
  const [skMulai, setSkMulai] = useState("");
  const [skSelesai, setSkSelesai] = useState("");
  const [catatan, setCatatan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!karyawanId || !judul.trim() || !pelanggaran.trim() || !terbit) {
      toast.error("Karyawan, judul, pelanggaran, dan tanggal terbit wajib diisi.");
      return;
    }
    runAction(
      createDisiplin({
        employeeId: karyawanId, level: tingkat, title: judul, violation: pelanggaran, seriousViolation: berat,
        publishedAt: terbit, validUntil: "", suspensionStart: skMulai,
        suspensionEnd: skSelesai, documentUrl: "", note: catatan,
      }, userId),
    );
  }

  function handleHapus(id: string) {
    if (!confirm("Hapus draf ini?")) return;
    runAction(deleteDisiplin(id, userId));
  }

  const kolomDisiplin: DataTableColumn<DisiplinRow>[] = [
    {
      id: "number",
      header: "Nomor",
      render: (d) => <span className="font-medium">{d.number}</span>,
      sortValue: (d) => d.number,
      searchValue: (d) => `${d.number} ${d.title}`,
    },
    { id: "karyawan", header: "Karyawan", accessor: "employeeName" },
    {
      id: "tingkat",
      header: "Tingkat",
      render: (d) => (
        <span>
          {d.levelLabel}
          {d.active ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">aktif</span> : null}
        </span>
      ),
      sortValue: (d) => d.levelLabel,
      searchValue: (d) => d.levelLabel,
    },
    {
      id: "status",
      header: "Status",
      render: (d) => <span>{d.status.replaceAll("_", " ")}</span>,
      sortValue: (d) => d.status,
      searchValue: (d) => d.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (d) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Link href={`/employees/disiplin/${d.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {d.status === "DRAFT" && bolehTerbit ? (
            <button type="button" disabled={isPending} onClick={() => runAction(publishDisiplin(d.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Terbitkan
            </button>
          ) : null}
          {d.status === "DRAFT" ? (
            <button type="button" disabled={isPending} onClick={() => handleHapus(d.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usulkan Surat (HR/Manajer)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Eskalasi SP1 → SP2 → SP3 → Skorsing → PHK dicek saat penerbitan (kecuali pelanggaran berat langsung PHK).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="karyawan" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Pilih karyawan" searchable />
          <FloatingSelect name="tingkat" label="Tingkat" value={tingkat} onValueChange={setTingkat} options={TINGKAT_OPTIONS} searchable={false} />
          <FloatingInput name="terbit" label="Tanggal Terbit" type="date" value={terbit} onChange={(e) => setTerbit(e.currentTarget.value)} />
          <FloatingInput name="title" label="Judul" value={judul} onChange={(e) => setJudul(e.currentTarget.value)} />
          <FloatingInput name="pelanggaran" label="Pelanggaran" value={pelanggaran} onChange={(e) => setPelanggaran(e.currentTarget.value)} />
          <FloatingInput name="catatan" label="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.currentTarget.value)} />
          {tingkat === "SKORSING" ? (
            <>
              <FloatingInput name="skMulai" label="Skorsing Mulai" type="date" value={skMulai} onChange={(e) => setSkMulai(e.currentTarget.value)} />
              <FloatingInput name="skSelesai" label="Skorsing Selesai" type="date" value={skSelesai} onChange={(e) => setSkSelesai(e.currentTarget.value)} />
            </>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={berat} onChange={() => setBerat((v) => !v)} className="h-4 w-4" />
            Pelanggaran berat (bisa langsung PHK)
          </label>
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
            columns={kolomDisiplin}
            getRowId={(d) => d.id}
            emptyMessage="Belum ada surat."
          />
        </div>
      </div>
    </div>
  );
}
