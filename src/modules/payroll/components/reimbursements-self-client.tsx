"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { submitReimbursement, cancelReimbursement, createReimbursement } from "@/src/modules/payroll/actions/reimbursements.actions";
import { REIMBURSE_CATEGORIES } from "@/src/modules/payroll/lib/uang-keluar";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

type KlaimSayaRow = { id: string; number: string; category: string; amount: string; description: string; status: string };

const rupiah = new Intl.NumberFormat("id-ID");

export default function ReimbursementSayaClient({
  userId,
  employeeId,
  items,
}: {
  userId: string;
  employeeId: string;
  items: KlaimSayaRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kategori, setKategori] = useState("TRANSPORT");
  const [tanggal, setDate] = useState("");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [lampiran, setLampiran] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!nominal || !keterangan.trim() || !lampiran.trim()) {
      toast.error("Nominal, keterangan, dan lampiran wajib diisi.");
      return;
    }
    runAction(createReimbursement({ employeeId, category: kategori, receiptDate: tanggal, amount: Number(nominal), description: keterangan, attachmentUrl: lampiran }, userId));
  }

  const kolomKlaim: DataTableColumn<KlaimSayaRow>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (k) => <span><span className="font-medium">{k.number}</span><br /><span className="text-xs text-slate-500">{k.category} • {k.description}</span></span>,
      sortValue: (k) => k.number,
      searchValue: (k) => `${k.number} ${k.category} ${k.description}`,
    },
    {
      id: "nominal",
      header: "Nominal",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (k) => <span>{rupiah.format(Number(k.amount))}</span>,
      sortValue: (k) => Number(k.amount),
      searchable: false,
    },
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
          <button type="button" disabled={isPending} onClick={() => runAction(submitReimbursement(k.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
            Ajukan
          </button>
        ) : ["DRAFT", "DIAJUKAN"].includes(k.status) ? (
          <button type="button" disabled={isPending} onClick={() => runAction(cancelReimbursement(k.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Klaim</h2>
        <p className="mt-1 text-xs text-slate-500">Struk/foto wajib dilampirkan (URL). Plafon per kategori berlaku.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect
            name="kategori"
            label="Kategori"
            value={kategori}
            onValueChange={setKategori}
            options={REIMBURSE_CATEGORIES.filter((k) => k !== "DINAS").map((k) => ({ value: k, label: k }))}
            searchable={false}
          />
          <FloatingInput name="tanggal" label="Tanggal Kwitansi" type="date" value={tanggal} onChange={(e) => setDate(e.currentTarget.value)} />
          <FloatingInput name="nominal" label="Nominal (Rp)" type="number" value={nominal} onChange={(e) => setNominal(e.currentTarget.value)} />
          <FloatingInput name="keterangan" label="Keterangan" value={keterangan} onChange={(e) => setKeterangan(e.currentTarget.value)} />
          <FloatingInput name="lampiran" label="URL Lampiran" value={lampiran} onChange={(e) => setLampiran(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleBuat}
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
            columns={kolomKlaim}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada klaim."
          />
        </div>
      </div>
    </div>
  );
}
