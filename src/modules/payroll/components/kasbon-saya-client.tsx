"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { ajukanKasbon, batalkanKasbon, buatKasbon, type KasbonItem } from "@/src/modules/payroll/actions/kasbon.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default function KasbonSayaClient({
  karyawanId,
  items,
}: {
  karyawanId: string;
  items: KasbonItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nominal, setNominal] = useState("");
  const [tenor, setTenor] = useState("10");
  const [mulai, setMulai] = useState("");
  const [alasan, setAlasan] = useState("");

  function handleBuat(ajukanLangsung: boolean) {
    if (!nominal || !tenor || !mulai || !alasan.trim()) {
      toast.error("Nominal, tenor, mulai potong, dan alasan wajib diisi.");
      return;
    }
    startTransition(async () => {
      const buat = await buatKasbon({
        karyawanId,
        nominal: Number(nominal),
        tenorBulan: Number(tenor),
        mulaiPotong: mulai,
        alasan,
      });
      if (!buat.success) {
        toast.error(buat.message);
        return;
      }
      if (ajukanLangsung && buat.id) {
        const aju = await ajukanKasbon(buat.id, karyawanId);
        if (!aju.success) {
          toast.error(aju.message);
          router.refresh();
          return;
        }
      }
      toast.success(ajukanLangsung ? "Kasbon diajukan ke Finance." : buat.message);
      setNominal("");
      setAlasan("");
      router.refresh();
    });
  }

  function handleBatal(id: string) {
    startTransition(async () => {
      const r = await batalkanKasbon(id, karyawanId);
      if (!r.success) toast.error(r.message);
      else toast.success(r.message);
      router.refresh();
    });
  }

  const kolomRiwayat: DataTableColumn<KasbonItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (k) => <span className="font-medium">{k.nomor}</span>,
      sortValue: (k) => k.nomor,
      searchValue: (k) => k.nomor,
    },
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
      render: (k) => <span>{k.status.replaceAll("_", " ")}{k.angsuranKe > 0 ? ` (${k.angsuranKe}x)` : ""}</span>,
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
        ["DRAFT", "DIAJUKAN"].includes(k.status) ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleBatal(k.id)}
            className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          >
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Kasbon</h2>
        <p className="mt-1 text-xs text-slate-500">
          Disetujui Finance → dipotong otomatis tiap gaji (nominal / tenor per bulan).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FloatingInput name="nominal" label="Nominal (Rp)" type="number" value={nominal} onChange={(e) => setNominal(e.currentTarget.value)} />
          <FloatingInput name="tenor" label="Tenor (bulan)" type="number" value={tenor} onChange={(e) => setTenor(e.currentTarget.value)} />
          <FloatingInput name="mulai" label="Mulai Potong" type="date" value={mulai} onChange={(e) => setMulai(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => handleBuat(false)} disabled={isPending} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50 disabled:opacity-60">
            Simpan Draf
          </button>
          <button type="button" onClick={() => handleBuat(true)} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Ajukan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Riwayat Saya</h2>
        <div className="mt-3">
          <DataTable
            data={items}
            columns={kolomRiwayat}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>
    </div>
  );
}
