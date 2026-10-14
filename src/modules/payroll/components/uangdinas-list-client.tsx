"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanUangDinas,
  batalkanUangDinas,
  buatUangDinas,
  catatKembali,
  catatSerah,
  hapusUangDinas,
  verifikasiLpj,
  type UangDinasItem,
} from "../actions/uangdinas.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function UangDinasListClient({
  userId,
  items,
  dinasOptions,
  karyawanOptions,
}: {
  userId: string;
  items: UangDinasItem[];
  dinasOptions: Array<{ value: string; label: string }>;
  karyawanOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dinasId, setDinasId] = useState("");
  const [karyawanId, setKaryawanId] = useState("");
  const [nominal, setNominal] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [pilihan, setPilihan] = useState<Record<string, string>>({});

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleTolakLpj(id: string) {
    const c = prompt("Alasan tolak LPJ:") ?? "";
    if (!c) return;
    runAction(verifikasiLpj(id, { setuju: false, catatan: c, pilihanSisa: "TUNAI" }, userId));
  }

  const kolomUangDinas: DataTableColumn<UangDinasItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (u) => <span><span className="font-medium">{u.nomor}</span><br /><span className="text-xs text-slate-500">{u.dinasNomor}</span></span>,
      sortValue: (u) => u.nomor,
      searchValue: (u) => `${u.nomor} ${u.dinasNomor}`,
    },
    { id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
    {
      id: "muka",
      header: "Muka",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (u) => <span>{rupiah.format(Number(u.nominalMuka))}</span>,
      sortValue: (u) => Number(u.nominalMuka),
      searchable: false,
    },
    {
      id: "selisih",
      header: "Selisih",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (u) => <span>{u.selisih !== null ? rupiah.format(Number(u.selisih)) : "-"}</span>,
      sortValue: (u) => (u.selisih !== null ? Number(u.selisih) : 0),
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (u) => <span>{u.status.replaceAll("_", " ")}</span>,
      sortValue: (u) => u.status,
      searchValue: (u) => u.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (u) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Link href={`/payroll/uang-dinas/${u.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {u.status === "DIAJUKAN" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(ajukanUangDinas(u.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {u.status === "DISETUJUI" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(catatSerah(u.id, userId))} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
              Catat Serah
            </button>
          ) : null}
          {u.status === "LPJ_DIAJUKAN" ? (
            <>
              <select
                value={pilihan[u.id] ?? "TUNAI"}
                onChange={(e) => setPilihan((p) => ({ ...p, [u.id]: e.currentTarget.value }))}
                className="h-7 rounded-lg border border-blue-200 text-xs"
              >
                <option value="TUNAI">Sisa tunai</option>
                <option value="POTONG_GAJI">Sisa potong gaji</option>
              </select>
              <button type="button" disabled={isPending} onClick={() => runAction(verifikasiLpj(u.id, { setuju: true, catatan: "", pilihanSisa: pilihan[u.id] ?? "TUNAI" }, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                Verifikasi
              </button>
              <button type="button" disabled={isPending} onClick={() => handleTolakLpj(u.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                Tolak
              </button>
            </>
          ) : null}
          {u.status === "SELESAI" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(catatKembali(u.id, userId))} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
              Kembali
            </button>
          ) : null}
          {["DRAFT", "DIAJUKAN"].includes(u.status) ? (
            <button type="button" disabled={isPending} onClick={() => runAction(batalkanUangDinas(u.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
          {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(u.status) ? (
            <button type="button" disabled={isPending} onClick={() => { if (!confirm("Hapus?")) return; runAction(hapusUangDinas(u.id, userId)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Uang Muka (dari dinas disetujui)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect name="dinas" label="Dinas" value={dinasId} onValueChange={setDinasId} options={dinasOptions} placeholder="Pilih dinas" searchable />
          <FloatingSelect name="karyawan" label="Karyawan (HR)" value={karyawanId} onValueChange={setKaryawanId} options={karyawanOptions} placeholder="Otomatis" searchable />
          <FloatingInput name="nominal" label="Nominal Muka (Rp)" type="number" value={nominal} onChange={(e) => setNominal(e.currentTarget.value)} />
          <FloatingInput name="keperluan" label="Keperluan" value={keperluan} onChange={(e) => setKeperluan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!dinasId || !nominal) {
                toast.error("Dinas dan nominal wajib diisi.");
                return;
              }
              runAction(buatUangDinas({ dinasId, karyawanId, nominalMuka: Number(nominal), keperluan }, userId));
            }}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
          >
            Buat Draf
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomUangDinas}
            getRowId={(u) => u.id}
            emptyMessage="Belum ada uang dinas."
          />
        </div>
      </div>
    </div>
  );
}
