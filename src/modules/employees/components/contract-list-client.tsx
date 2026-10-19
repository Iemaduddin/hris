"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { extendContractsBatch } from "../actions/contracts.actions";
import type { ExpiringContractItem } from "../actions/employee.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const JENIS_OPTIONS = [
  { value: "PKWT", label: "PKWT" },
  { value: "PKWTT", label: "PKWTT" },
  { value: "MAGANG", label: "Magang" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "OUTSOURCING", label: "Outsourcing" },
];

export default function ContractListClient({
  userId,
  items,
}: {
  userId: string;
  items: ExpiringContractItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<string[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [selesai, setSelesai] = useState("");
  const [jenis, setJenis] = useState("PKWT");
  const [gapok, setGapok] = useState("");
  const [catatan, setCatatan] = useState("");

  function handleBatch() {
    if (checked.length === 0) {
      toast.error("Pilih minimal satu kontrak.");
      return;
    }
    if (!selesai) {
      toast.error("Tanggal selesai baru wajib diisi.");
      return;
    }
    if (!confirm(`Perpanjang ${checked.length} kontrak? Kontrak lama BERAKHIR, kontrak baru AKTIF bernomor otomatis.`)) return;
    startTransition(async () => {
      const result = await extendContractsBatch(
        { contractIds: checked, endDate: selesai, contractType: jenis, baseSalary: gapok, note: catatan },
        userId,
      );
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setChecked([]);
        setSelectionResetKey((prev) => prev + 1);
      }
      router.refresh();
    });
  }

  const kolomKontrak: DataTableColumn<ExpiringContractItem>[] = [
    {
      id: "nomor",
      header: "Kontrak",
      render: (k) => <span className="font-medium">{k.contractNumber} <span className="text-xs font-normal text-slate-500">({k.contractType})</span></span>,
      sortValue: (k) => k.contractNumber,
      searchValue: (k) => `${k.contractNumber} ${k.contractType}`,
    },
    { id: "karyawan", header: "Employee", accessor: "employeeName" },
    {
      id: "selesai",
      header: "Selesai",
      render: (k) => <span>{k.endDate.slice(0, 10)}</span>,
      sortValue: (k) => k.endDate,
      searchable: false,
    },
    {
      id: "sisa",
      header: "Sisa",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (k) => <span>H-{k.remainingDays}</span>,
      sortValue: (k) => k.remainingDays,
      searchable: false,
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (k) => (
        <Link href={`/employees/contracts/${k.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
          Buka
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Perpanjangan Massal {checked.length > 0 ? `(${checked.length} dipilih)` : ""}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Append-only: kontrak lama ditutup (BERAKHIR), kontrak baru AKTIF dengan nomor otomatis.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingInput name="selesai" label="Selesai Baru" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
          <FloatingSelect name="jenis" label="Jenis Baru" value={jenis} onValueChange={setJenis} options={JENIS_OPTIONS} searchable={false} />
          <FloatingInput name="gapok" label="Gapok Baru (kosong = ikut lama)" type="number" value={gapok} onChange={(e) => setGapok(e.currentTarget.value)} />
          <FloatingInput name="catatan" label="Catatan" value={catatan} onChange={(e) => setCatatan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleBatch} disabled={isPending || checked.length === 0} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            Perpanjang Terpilih
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Akan Berakhir (H-60)</h2>
        <div className="mt-3">
          <DataTable
            data={items}
            columns={kolomKontrak}
            getRowId={(k) => k.id}
            emptyMessage="Tidak ada kontrak mendekati akhir."
            onSelectionChange={setChecked}
            selectionResetKey={selectionResetKey}
          />
        </div>
      </div>
    </div>
  );
}
