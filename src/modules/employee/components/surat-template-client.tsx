"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingTextarea from "@/src/components/ui/floating-input/textarea";
import { hapusTemplate, saveTemplate, seedTemplateBawaan } from "@/src/modules/employee/actions/surat.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type SuratTemplateRow = { id: string; kode: string; nama: string; judul: string; isActive: boolean };

export default function SuratTemplateClient({
  userId,
  items,
}: {
  userId: string;
  items: SuratTemplateRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editId, setEditId] = useState("");
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [judul, setJudul] = useState("");
  const [badan, setBadan] = useState("");
  const [aktif, setAktif] = useState(true);

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  async function muatEdit(id: string) {
    const res = await fetch(`/api/surat-template/${id}`);
    if (!res.ok) {
      toast.error("Gagal memuat template.");
      return;
    }
    const body = (await res.json()) as {
      template?: { id: string; kode: string; nama: string; judul: string; badan: string; isActive: boolean };
    };
    if (!body.template) {
      toast.error("Template tidak ditemukan.");
      return;
    }
    const t = body.template;
    setEditId(t.id);
    setKode(t.kode);
    setNama(t.nama);
    setJudul(t.judul);
    setBadan(t.badan);
    setAktif(t.isActive);
  }

  function reset() {
    setEditId("");
    setKode("");
    setNama("");
    setJudul("");
    setBadan("");
    setAktif(true);
  }

  function handleHapus(id: string) {
    if (!confirm("Hapus template ini?")) return;
    runAction(hapusTemplate(id, userId));
  }

  const kolomTemplate: DataTableColumn<SuratTemplateRow>[] = [
    {
      id: "kode",
      header: "Kode",
      render: (t) => <span className="font-medium">{t.kode}</span>,
      sortValue: (t) => t.kode,
      searchValue: (t) => `${t.kode} ${t.nama}`,
    },
    { id: "nama", header: "Nama", accessor: "nama" },
    {
      id: "status",
      header: "Status",
      render: (t) => <span>{t.isActive ? "Aktif" : "Nonaktif"}</span>,
      sortValue: (t) => (t.isActive ? "Aktif" : "Nonaktif"),
      searchValue: (t) => (t.isActive ? "Aktif" : "Nonaktif"),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (t) => (
        <div className="inline-flex gap-2">
          <button type="button" onClick={() => void muatEdit(t.id)} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleHapus(t.id)}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Template Aktif</h2>
          <button
            type="button"
            onClick={() => runAction(seedTemplateBawaan(userId))}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-lg border border-emerald-200 px-3 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Seed Bawaan
          </button>
        </div>
        <div className="mt-3">
          <DataTable
            data={items}
            columns={kolomTemplate}
            getRowId={(t) => t.id}
            emptyMessage="Belum ada template. Klik “Seed Bawaan”."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {editId ? "Edit Template" : "Template Baru"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">Gunakan {"{{nama}}"} untuk variabel (nama, tanggal, dsb).</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingInput name="kode" label="Kode (huruf/angka/_)" value={kode} onChange={(e) => setKode(e.currentTarget.value.toUpperCase())} disabled={!!editId} />
          <FloatingInput name="nama" label="Nama" value={nama} onChange={(e) => setNama(e.currentTarget.value)} />
          <FloatingInput name="judul" label="Judul Surat" value={judul} onChange={(e) => setJudul(e.currentTarget.value)} />
        </div>
        <div className="mt-4">
          <FloatingTextarea name="badan" label="Badan Surat" value={badan} onChange={(e) => setBadan(e.currentTarget.value)} rows={6} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aktif} onChange={() => setAktif((v) => !v)} className="h-4 w-4" />
            Aktif
          </label>
          <div className="flex gap-2">
            {editId ? (
              <button type="button" onClick={reset} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50">
                Batal
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => runAction(saveTemplate({ id: editId || undefined, kode, nama, judul, badan, isActive: aktif }, userId).then((r) => { if (r.success) reset(); return r; }))}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
