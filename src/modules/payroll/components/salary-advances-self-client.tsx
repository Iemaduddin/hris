"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import { submitSalaryAdvance, cancelSalaryAdvance, createSalaryAdvance, type SalaryAdvanceItem } from "@/src/modules/payroll/actions/salary-advances.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default function KasbonSayaClient({
  employeeId,
  items,
}: {
  employeeId: string;
  items: SalaryAdvanceItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [tenor, setTenor] = useState("10");
  const [deductionStart, setDeductionStart] = useState("");
  const [reason, setReason] = useState("");

  function handleCreate(submitDirect: boolean) {
    if (!amount || !tenor || !deductionStart || !reason.trim()) {
      toast.error("Nominal, tenor, mulai potong, dan reason wajib diisi.");
      return;
    }
    startTransition(async () => {
      const draft = await createSalaryAdvance({
        employeeId,
        amount: Number(amount),
        tenorMonths: Number(tenor),
        deductionStart,
        reason,
      });
      if (!draft.success) {
        toast.error(draft.message);
        return;
      }
      if (submitDirect && draft.id) {
        const submitted = await submitSalaryAdvance(draft.id, employeeId);
        if (!submitted.success) {
          toast.error(submitted.message);
          router.refresh();
          return;
        }
      }
      toast.success(submitDirect ? "Kasbon diajukan ke Finance." : draft.message);
      setAmount("");
      setReason("");
      router.refresh();
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      const r = await cancelSalaryAdvance(id, employeeId);
      if (!r.success) toast.error(r.message);
      else toast.success(r.message);
      router.refresh();
    });
  }

  const historyColumns: DataTableColumn<SalaryAdvanceItem>[] = [
    {
      id: "nomor",
      header: "Nomor",
      render: (k) => <span className="font-medium">{k.number}</span>,
      sortValue: (k) => k.number,
      searchValue: (k) => k.number,
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
      id: "angsuran",
      header: "Angsuran",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: (k) => <span>{rupiah.format(Number(k.monthlyInstallment))} × {k.tenorMonths}</span>,
    },
    {
      id: "sisa",
      header: "Sisa",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold",
      render: (k) => <span>{rupiah.format(Number(k.remainingDebt))}</span>,
      sortValue: (k) => Number(k.remainingDebt),
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (k) => <span>{k.status.replaceAll("_", " ")}{k.installmentNo > 0 ? ` (${k.installmentNo}x)` : ""}</span>,
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
            onClick={() => handleCancel(k.id)}
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
          <FloatingInput name="amount" label="Nominal (Rp)" type="number" value={amount} onChange={(e) => setAmount(e.currentTarget.value)} />
          <FloatingInput name="tenor" label="Tenor (bulan)" type="number" value={tenor} onChange={(e) => setTenor(e.currentTarget.value)} />
          <FloatingInput name="deductionStart" label="Mulai Potong" type="date" value={deductionStart} onChange={(e) => setDeductionStart(e.currentTarget.value)} />
          <FloatingInput name="reason" label="Alasan" value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => handleCreate(false)} disabled={isPending} className="inline-flex h-10 items-center rounded-lg border border-blue-200 px-4 text-sm hover:bg-blue-50 disabled:opacity-60">
            Simpan Draf
          </button>
          <button type="button" onClick={() => handleCreate(true)} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Ajukan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Riwayat Saya</h2>
        <div className="mt-3">
          <DataTable
            data={items}
            columns={historyColumns}
            getRowId={(k) => k.id}
            emptyMessage="Belum ada pengajuan."
          />
        </div>
      </div>
    </div>
  );
}
