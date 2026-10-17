"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { deleteLeaveType, generateBalances, saveLeaveType, type LeaveTypeItem } from "../actions/leave.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const CATEGORY_OPTIONS = [
  { value: "CUTI", label: "Cuti" },
  { value: "IZIN", label: "Izin" },
];

const BOOL_OPTIONS = [
  { value: "true", label: "Ya" },
  { value: "false", label: "Tidak" },
];

const EMPTY = { code: "", name: "", category: "CUTI", usesBalance: "false", annualQuota: "", requiresAttachment: "false", isActive: "true" };

export default function LeaveTypeForm({ items, activeYear }: { items: LeaveTypeItem[]; activeYear: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [year, setYear] = useState(String(activeYear));

  function applySelection(id: number | null) {
    setSelectedId(id);
    const next = items.find((i) => i.id === id);
    setValues(
      next
        ? {
            code: next.code,
            name: next.name,
            category: next.category,
            usesBalance: next.usesBalance ? "true" : "false",
            annualQuota: next.annualQuota ?? "",
            requiresAttachment: next.requiresAttachment ? "true" : "false",
            isActive: next.isActive ? "true" : "false",
          }
        : EMPTY,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (selectedId) fd.set("id", String(selectedId));
    fd.set("code", values.code);
    fd.set("name", values.name);
    fd.set("category", values.category);
    fd.set("usesBalance", values.usesBalance);
    fd.set("annualQuota", values.annualQuota);
    fd.set("requiresAttachment", values.requiresAttachment);
    fd.set("isActive", values.isActive);
    startTransition(async () => {
      const result = await saveLeaveType(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      applySelection(null);
      router.refresh();
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Hapus jenis ini?")) return;
    startTransition(async () => {
      const result = await deleteLeaveType(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (selectedId === id) applySelection(null);
      router.refresh();
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateBalances(Number(year));
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const typeColumns: DataTableColumn<LeaveTypeItem>[] = [
    {
      id: "kode",
      header: "Kode",
      render: (item) => <span className="font-medium">{item.code}</span>,
      sortValue: (item) => item.code,
      searchValue: (item) => `${item.code} ${item.name}`,
    },
    { id: "nama", header: "Nama", accessor: "name" },
    { id: "kategori", header: "Kategori", accessor: "category" },
    {
      id: "jatah",
      header: "Jatah",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (item) => <span>{item.usesBalance ? item.annualQuota : "-"}</span>,
      sortValue: (item) => Number(item.annualQuota ?? 0),
      searchable: false,
    },
    {
      id: "aktif",
      header: "Aktif",
      render: (item) => <span>{item.isActive ? "Ya" : "Tidak"}</span>,
      sortValue: (item) => (item.isActive ? "Ya" : "Tidak"),
      searchable: false,
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
          <button type="button" onClick={() => applySelection(item.id)} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Edit
          </button>
          <button type="button" onClick={() => handleDelete(item.id)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {selectedId ? "Edit Jenis" : "Jenis Baru"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingInput name="code" label="Kode" value={values.code} onChange={(e) => setValues((p) => ({ ...p, code: e.currentTarget.value.toUpperCase() }))} required />
          <FloatingInput name="name" label="Nama" value={values.name} onChange={(e) => setValues((p) => ({ ...p, name: e.currentTarget.value }))} required />
          <FloatingSelect name="category" label="Kategori" value={values.category} onValueChange={(v) => setValues((p) => ({ ...p, category: v }))} options={CATEGORY_OPTIONS} />
          <FloatingSelect name="usesBalance" label="Pakai Saldo" value={values.usesBalance} onValueChange={(v) => setValues((p) => ({ ...p, usesBalance: v }))} options={BOOL_OPTIONS} />
          <FloatingInput name="annualQuota" label="Jatah Tahunan" type="number" value={values.annualQuota} onChange={(e) => setValues((p) => ({ ...p, annualQuota: e.currentTarget.value }))} />
          <FloatingSelect name="requiresAttachment" label="Wajib Lampiran" value={values.requiresAttachment} onValueChange={(v) => setValues((p) => ({ ...p, requiresAttachment: v }))} options={BOOL_OPTIONS} />
          <FloatingSelect name="isActive" label="Aktif" value={values.isActive} onValueChange={(v) => setValues((p) => ({ ...p, isActive: v }))} options={BOOL_OPTIONS} />
          <div className="flex items-end justify-end gap-2 md:col-span-4">
            {selectedId ? (
              <button type="button" onClick={() => applySelection(null)} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50">
                Buat Baru
              </button>
            ) : null}
            <button type="submit" disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
              {isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Generate Saldo Tahunan</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <FloatingInput name="year" label="Tahun" type="number" value={year} onChange={(e) => setYear(e.currentTarget.value)} />
          <button type="button" onClick={handleGenerate} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
            Generate
          </button>
        </div>
      </div>

    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={typeColumns}
            getRowId={(item) => String(item.id)}
            emptyMessage="Belum ada jenis cuti/izin."
          />
        </div>
      </div>
    </div>
  );
}
