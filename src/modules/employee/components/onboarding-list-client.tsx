"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  batalkanOnboarding,
  buatOnboarding,
  hapusOnboarding,
  hapusTemplate,
  saveTemplate,
  seedTemplateBawaan,
  tutupOnboarding,
  type OnboardingItem,
  type TemplateItem,
} from "../actions/onboarding.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const KATEGORI_OPTIONS = [
  { value: "DOKUMEN", label: "Dokumen" },
  { value: "AKUN", label: "Akun" },
  { value: "ASET", label: "Aset" },
  { value: "ORIENTASI", label: "Orientasi" },
  { value: "LAINNYA", label: "Lainnya" },
];

const JENIS_KONTRAK_OPTIONS = [
  { value: "", label: "Umum (semua jenis)" },
  { value: "PKWT", label: "PKWT" },
  { value: "PKWTT", label: "PKWTT" },
  { value: "MAGANG", label: "Magang" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "OUTSOURCING", label: "Outsourcing" },
];

type BarisItem = { judul: string; kategori: string; wajib: boolean };

export default function OnboardingListClient({
  userId,
  items,
  templates,
  options,
}: {
  userId: string;
  items: OnboardingItem[];
  templates: TemplateItem[];
  options: {
    karyawan: Array<{ value: string; label: string }>;
    templates: Array<{ value: string; label: string }>;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [karyawanId, setKaryawanId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [target, setTarget] = useState("");

  const [tNama, setTNama] = useState("");
  const [tJenis, setTJenis] = useState("");
  const [tRows, setTRows] = useState<BarisItem[]>([{ judul: "", kategori: "DOKUMEN", wajib: true }]);

  function refresh(ok: boolean, message: string) {
    if (!ok) toast.error(message);
    else toast.success(message);
    router.refresh();
  }

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      refresh(result.success, result.message);
    });
  }

  function handleBuat() {
    if (!karyawanId || !templateId) {
      toast.error("Karyawan dan template wajib dipilih.");
      return;
    }
    runAction(buatOnboarding({ karyawanId, templateId, targetSelesai: target }, userId));
  }

  function handleHapusTemplate(id: string) {
    if (!confirm("Hapus template ini?")) return;
    runAction(hapusTemplate(id));
  }

  function handleHapus(id: string) {
    if (!confirm("Hapus onboarding ini?")) return;
    runAction(hapusOnboarding(id, userId));
  }

  const kolomTemplate: DataTableColumn<TemplateItem>[] = [
    {
      id: "nama",
      header: "Nama",
      render: (t) => <span className="font-medium">{t.templateNama}</span>,
      sortValue: (t) => t.templateNama,
      searchValue: (t) => t.templateNama,
    },
    {
      id: "kontrak",
      header: "Kontrak",
      render: (t) => <span>{t.jenisKontrak ?? "Umum"}</span>,
      sortValue: (t) => t.jenisKontrak ?? "Umum",
      searchValue: (t) => t.jenisKontrak ?? "Umum",
    },
    {
      id: "jumlah",
      header: "Item",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (t) => <span>{t.jumlahItem}</span>,
      sortValue: (t) => t.jumlahItem,
      searchable: false,
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (t) => (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleHapusTemplate(t.id)}
          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Hapus
        </button>
      ),
    },
  ];

  const kolomOnboarding: DataTableColumn<OnboardingItem>[] = [
    { id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
    {
      id: "template",
      header: "Template",
      render: (o) => <span>{o.templateNama ?? "-"}</span>,
      sortValue: (o) => o.templateNama ?? "-",
      searchValue: (o) => o.templateNama ?? "",
    },
    {
      id: "progres",
      header: "Progres",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (o) => <span>{o.persen}% ({o.wajibSelesai} wajib)</span>,
      sortValue: (o) => o.persen,
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (o) => <span>{o.status.replaceAll("_", " ")}</span>,
      sortValue: (o) => o.status,
      searchValue: (o) => o.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (o) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Link href={`/employees/onboarding/${o.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {o.status === "BERJALAN" ? (
            <>
              <button type="button" disabled={isPending} onClick={() => runAction(tutupOnboarding(o.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                Tutup
              </button>
              <button type="button" disabled={isPending} onClick={() => runAction(batalkanOnboarding(o.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batal
              </button>
            </>
          ) : null}
          {o.status === "DIBATALKAN" ? (
            <button type="button" disabled={isPending} onClick={() => handleHapus(o.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
              Hapus
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  function handleSimpanTemplate() {
    runAction(
      saveTemplate({
        nama: tNama,
        jenisKontrak: tJenis,
        isActive: true,
        items: tRows.map((r) => ({ judul: r.judul, deskripsi: "", kategori: r.kategori, wajib: r.wajib })),
      }),
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Template Checklist</h2>
          <button
            type="button"
            onClick={() => runAction(seedTemplateBawaan())}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-lg border border-emerald-200 px-3 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Seed Bawaan
          </button>
        </div>
        <div className="mt-3">
          <DataTable
            data={templates}
            columns={kolomTemplate}
            getRowId={(t) => t.id}
            emptyMessage="Belum ada template."
          />
        </div>

        <h3 className="mt-5 font-semibold">Template Baru</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingInput name="tNama" label="Nama Template" value={tNama} onChange={(e) => setTNama(e.currentTarget.value)} />
          <FloatingSelect name="tJenis" label="Jenis Kontrak" value={tJenis} onValueChange={setTJenis} options={JENIS_KONTRAK_OPTIONS} searchable={false} />
        </div>
        {tRows.map((r, i) => (
          <div key={i} className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">
            <FloatingInput name={`judul-${i}`} label={`Item ${i + 1}`} value={r.judul} onChange={(e) => setTRows((prev) => prev.map((x, j) => (j === i ? { ...x, judul: e.currentTarget.value } : x)))} />
            <FloatingSelect name={`kat-${i}`} label="Kategori" value={r.kategori} onValueChange={(v) => setTRows((prev) => prev.map((x, j) => (j === i ? { ...x, kategori: v } : x)))} options={KATEGORI_OPTIONS} searchable={false} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.wajib} onChange={() => setTRows((prev) => prev.map((x, j) => (j === i ? { ...x, wajib: !x.wajib } : x)))} className="h-4 w-4" />
              Wajib
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setTRows((prev) => prev.filter((_, j) => j !== i))}
                disabled={tRows.length <= 1}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Hapus baris
              </button>
            </div>
          </div>
        ))}
        <div className="mt-3 flex justify-between">
          <button type="button" onClick={() => setTRows((prev) => [...prev, { judul: "", kategori: "LAINNYA", wajib: true }])} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            + Baris
          </button>
          <button type="button" onClick={handleSimpanTemplate} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Simpan Template
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mulai Onboarding</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="karyawan" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={options.karyawan} placeholder="Pilih karyawan" searchable />
          <FloatingSelect name="template" label="Template" value={templateId} onValueChange={setTemplateId} options={options.templates} placeholder="Pilih template" searchable />
          <FloatingInput name="target" label="Target Selesai (opsional)" type="date" value={target} onChange={(e) => setTarget(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomOnboarding}
            getRowId={(o) => o.id}
            emptyMessage="Belum ada onboarding."
          />
        </div>
      </div>
    </div>
  );
}
