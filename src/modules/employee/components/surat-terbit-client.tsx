"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  deleteLetter,
  publishLetter,
  type RefOption,
} from "../actions/surat.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type SuratRow = { id: string; number: string; kind: string; employeeName: string | null; createdAt: string };

const JENIS_OPTIONS = [
  { value: "MUT", label: "Mutasi / Promosi (dari data)" },
  { value: "PAK", label: "Paklaring (dari offboarding selesai)" },
  { value: "SP", label: "Peringatan / PHK (dari surat terbit)" },
  { value: "KET", label: "Keterangan Kerja (manual)" },
];

export default function SuratTerbitClient({
  userId,
  items,
  refs,
  employees,
  templates,
}: {
  userId: string;
  items: SuratRow[];
  refs: Record<string, RefOption[]>;
  employees: RefOption[];
  templates: Array<{ value: string; label: string; code: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setJenis] = useState("MUT");
  const [refId, setRefId] = useState("");
  const [karyawanId, setKaryawanId] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [templateId, setTemplateId] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  const templateOpsi = templates.filter(
    (t) => t.code === ({ MUT: "MUTASI", PAK: "PAKLARING", SP: "SP", KET: "KETERANGAN" } as Record<string, string>)[kind],
  );

  function handleHapus(id: string) {
    if (!confirm("Hapus surat ini?")) return;
    runAction(deleteLetter(id, userId));
  }

  const kolomSurat: DataTableColumn<SuratRow>[] = [
    {
      id: "number",
      header: "Nomor",
      render: (s) => <span className="font-medium">{s.number}</span>,
      sortValue: (s) => s.number,
      searchValue: (s) => s.number,
    },
    { id: "kind", header: "Jenis", accessor: "kind" },
    {
      id: "karyawan",
      header: "Karyawan",
      render: (s) => <span>{s.employeeName ?? "-"}</span>,
      sortValue: (s) => s.employeeName ?? "-",
      searchValue: (s) => s.employeeName ?? "",
    },
    { id: "terbit", header: "Terbit", accessor: "createdAt" },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (s) => (
        <div className="inline-flex gap-2">
          <Link href={`/employees/surat/${s.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleHapus(s.id)}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Terbitkan Surat</h2>
        <p className="mt-1 text-xs text-slate-500">Nomor formal otomatis + QR verifikasi.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="kind" label="Jenis" value={kind} onValueChange={(v) => { setJenis(v); setRefId(""); }} options={JENIS_OPTIONS} searchable={false} />
          {kind === "KET" ? (
            <FloatingSelect name="karyawan" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={employees} placeholder="Pilih karyawan" searchable />
          ) : (
            <FloatingSelect name="ref" label="Referensi" value={refId} onValueChange={setRefId} options={refs[kind] ?? []} placeholder="Pilih data" searchable />
          )}
          <FloatingSelect name="template" label="Template" value={templateId} onValueChange={setTemplateId} options={templateOpsi} placeholder="Pilih template" searchable />
          {kind === "KET" ? (
            <FloatingInput name="keperluan" label="Keperluan" value={keperluan} onChange={(e) => setKeperluan(e.currentTarget.value)} />
          ) : null}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => runAction(publishLetter({ kind, referenceId: refId, employeeId: karyawanId, purpose: keperluan, templateId }, userId))}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            Terbitkan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomSurat}
            getRowId={(s) => s.id}
            emptyMessage="Belum ada surat terbit."
          />
        </div>
      </div>
    </div>
  );
}
