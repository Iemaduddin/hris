"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { ajukanKoreksi, batalkanKoreksi, buatKoreksi, type KoreksiItem } from "@/src/modules/attendance/actions/koreksi.actions";

const TIPE_OPTIONS = [
  { value: "MASUK", label: "Masuk" },
  { value: "KELUAR", label: "Keluar" },
  { value: "MULAI_ISTIRAHAT", label: "Mulai Istirahat" },
  { value: "SELESAI_ISTIRAHAT", label: "Selesai Istirahat" },
  { value: "KELUAR_KANTOR", label: "Keluar Kantor" },
  { value: "KEMBALI_KANTOR", label: "Kembali Kantor" },
];

export default function KoreksiListClient({
  userId,
  items,
}: {
  userId: string;
  items: KoreksiItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tanggal, setTanggal] = useState("");
  const [tipe, setTipe] = useState("MASUK");
  const [jam, setJam] = useState("");
  const [alasan, setAlasan] = useState("");
  const [lampiran, setLampiran] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  const kolomKoreksi: DataTableColumn<KoreksiItem>[] = [
    {
      id: "tanggal",
      header: "Tanggal",
      render: (k) => <span className="font-medium">{k.tanggal}</span>,
      sortValue: (k) => k.tanggal,
      searchValue: (k) => k.tanggal,
    },
    {
      id: "tipe",
      header: "Tipe",
      render: (k) => <span>{k.tipe.replaceAll("_", " ")}</span>,
      sortValue: (k) => k.tipe,
      searchValue: (k) => k.tipe.replaceAll("_", " "),
    },
    { id: "waktuBaru", header: "Jam Benar", accessor: "waktuBaru" },
    {
      id: "status",
      header: "Status",
      render: (k) => <span>{k.status.replaceAll("_", " ")}</span>,
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
      render: (k) =>
        k.status === "DRAFT" ? (
          <button type="button" disabled={isPending} onClick={() => runAction(ajukanKoreksi(k.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
            Ajukan
          </button>
        ) : ["DRAFT", "DIAJUKAN"].includes(k.status) ? (
          <button type="button" disabled={isPending} onClick={() => runAction(batalkanKoreksi(k.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
            Batalkan
          </button>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Koreksi</h2>
        <p className="mt-1 text-xs text-slate-500">
          Lupa/telat clock-in? Usulkan jam yang benar + bukti — diproses atasan lalu HR.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingInput name="tanggal" label="Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.currentTarget.value)} />
          <FloatingSelect name="tipe" label="Tipe" value={tipe} onValueChange={setTipe} options={TIPE_OPTIONS} searchable={false} />
          <FloatingInput name="jam" label="Jam Seharusnya (HH:MM)" type="time" value={jam} onChange={(e) => setJam(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
          <FloatingInput name="lampiran" label="URL Bukti (opsional)" value={lampiran} onChange={(e) => setLampiran(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!tanggal || !jam || !alasan.trim()) {
                toast.error("Tanggal, jam, dan alasan wajib diisi.");
                return;
              }
              runAction(buatKoreksi({ tanggal, tipe, jam, alasan, lampiranUrl: lampiran }, userId));
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
            columns={kolomKoreksi}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>
    </div>
  );
}
