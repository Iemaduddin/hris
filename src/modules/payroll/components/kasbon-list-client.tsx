"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanKasbon,
  batalkanKasbon,
  buatKasbon,
  hapusKasbon,
  setujuiKasbon,
  tolakKasbon,
  type KasbonItem,
} from "../actions/kasbon.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function KasbonListClient({
  items,
  karyawanOptions,
}: {
  items: KasbonItem[];
  karyawanOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [nominal, setNominal] = useState("");
  const [tenor, setTenor] = useState("10");
  const [mulai, setMulai] = useState("");
  const [alasan, setAlasan] = useState("");
  const [tolakId, setTolakId] = useState("");
  const [tolakCatatan, setTolakCatatan] = useState("");

  function refresh(ok: boolean, message: string) {
    if (!ok) toast.error(message);
    else toast.success(message);
    router.refresh();
  }

  function handleBuat() {
    if (!karyawanId || !nominal || !tenor || !mulai || !alasan.trim()) {
      toast.error("Karyawan, nominal, tenor, mulai potong, dan alasan wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await buatKasbon({
        karyawanId,
        nominal: Number(nominal),
        tenorBulan: Number(tenor),
        mulaiPotong: mulai,
        alasan,
      });
      refresh(result.success, result.message);
      if (result.success) {
        setNominal("");
        setAlasan("");
      }
    });
  }

  function handleTolak() {
    if (!tolakId) return;
    startTransition(async () => {
      const result = await tolakKasbon(tolakId, tolakCatatan);
      refresh(result.success, result.message);
      setTolakId("");
      setTolakCatatan("");
    });
  }

  const kolomKasbon: DataTableColumn<KasbonItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (k) => <span className="font-medium">{k.nomor}</span>,
      sortValue: (k) => k.nomor,
      searchValue: (k) => k.nomor,
    },
    { id: "karyawan", header: "Karyawan", accessor: "karyawanNama" },
    {
      id: "nominal",
      header: "Nominal",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (k) => <span>{rupiah.format(Number(k.nominal))}</span>,
      sortValue: (k) => Number(k.nominal),
      searchable: false,
    },
    {
      id: "angsuran",
      header: "Angsuran",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (k) => <span>{rupiah.format(Number(k.angsuranPerBulan))} × {k.tenorBulan}</span>,
    },
    {
      id: "sisa",
      header: "Sisa",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold",
      render: (k) => <span>{rupiah.format(Number(k.sisaHutang))}</span>,
      sortValue: (k) => Number(k.sisaHutang),
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (k) => <span>{k.status.replaceAll("_", " ")}{k.angsuranKe > 0 ? ` (${k.angsuranKe}x cicil)` : ""}</span>,
      sortValue: (k) => k.status,
      searchValue: (k) => k.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (k) => (
        <div className="inline-flex flex-wrap justify-end gap-2">
          {k.status === "DRAFT" ? (
            <button type="button" disabled={isPending} onClick={() => startTransition(async () => { const r = await ajukanKasbon(k.id); refresh(r.success, r.message); })} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {k.status === "DIAJUKAN" ? (
            <>
              <button type="button" disabled={isPending} onClick={() => startTransition(async () => { const r = await setujuiKasbon(k.id); refresh(r.success, r.message); })} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                Setujui
              </button>
              <button type="button" disabled={isPending} onClick={() => setTolakId(k.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                Tolak
              </button>
            </>
          ) : null}
          {["DRAFT", "DIAJUKAN"].includes(k.status) ? (
            <button type="button" disabled={isPending} onClick={() => startTransition(async () => { const r = await batalkanKasbon(k.id); refresh(r.success, r.message); })} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batal
            </button>
          ) : null}
          {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(k.status) ? (
            <button type="button" disabled={isPending} onClick={() => { if (!confirm("Hapus kasbon ini?")) return; startTransition(async () => { const r = await hapusKasbon(k.id); refresh(r.success, r.message); }); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Buat Kasbon (HR/Finance)</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect
            name="karyawan"
            label="Karyawan"
            value={karyawanId}
            onValueChange={setKaryawanId}
            options={karyawanOptions}
            placeholder="Pilih karyawan"
            searchable
          />
          <FloatingInput name="nominal" label="Nominal (Rp)" type="number" value={nominal} onChange={(e) => setNominal(e.currentTarget.value)} />
          <FloatingInput name="tenor" label="Tenor (bulan)" type="number" value={tenor} onChange={(e) => setTenor(e.currentTarget.value)} />
          <FloatingInput name="mulai" label="Mulai Potong" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
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
            columns={kolomKasbon}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada kasbon."
          />
        </div>
      </div>

      {tolakId ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30">
          <h2 className="text-lg font-semibold">Tolak Kasbon</h2>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <FloatingInput name="catatan" label="Alasan penolakan" value={tolakCatatan} onChange={(e) => setTolakCatatan(e.currentTarget.value)} />
            <button type="button" onClick={handleTolak} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70">
              Tolak
            </button>
            <button type="button" onClick={() => setTolakId("")} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50">
              Urungkan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
