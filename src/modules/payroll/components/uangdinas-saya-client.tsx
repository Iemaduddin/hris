"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  submitLpj,
  submitUangDinas,
  cancelUangDinas,
  createUangDinas,
  type TravelAdvanceItem,
} from "@/src/modules/payroll/actions/uangdinas.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

const rupiah = new Intl.NumberFormat("id-ID");

export default function UangDinasSayaClient({
  userId,
  employeeId,
  items,
  dinasOptions,
}: {
  userId: string;
  employeeId: string;
  items: TravelAdvanceItem[];
  dinasOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dutyId, setDinasId] = useState("");
  const [nominal, setNominal] = useState("");
  const [purpose, setKeperluan] = useState("");
  const [realisasi, setRealisasi] = useState<Record<string, string>>({});
  const [bukti, setBukti] = useState<Record<string, string>>({});

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!dutyId || !nominal) {
      toast.error("Dinas dan nominal wajib diisi.");
      return;
    }
    runAction(createUangDinas({ dutyId, employeeId, advanceAmount: Number(nominal), purpose }, userId));
  }

  function handleLpj(id: string) {
    if (!realisasi[id] || !bukti[id]?.trim()) {
      toast.error("Realisasi dan bukti wajib diisi.");
      return;
    }
    runAction(submitLpj(id, { actualTotal: Number(realisasi[id]), attachmentUrl: bukti[id] }, userId));
  }

  const kolomSaya: DataTableColumn<TravelAdvanceItem>[] = [
    {
      id: "number",
      header: "Nomor",
      render: (u) => <span><span className="font-medium">{u.number}</span><br /><span className="text-xs text-slate-500">{u.dutyNumber}</span></span>,
      sortValue: (u) => u.number,
      searchValue: (u) => `${u.number} ${u.dutyNumber}`,
    },
    {
      id: "muka",
      header: "Muka",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (u) => <span>{rupiah.format(Number(u.advanceAmount))}</span>,
      sortValue: (u) => Number(u.advanceAmount),
      searchable: false,
    },
    {
      id: "status",
      header: "Status",
      render: (u) => <span>{u.status.replaceAll("_", " ")}{u.difference !== null ? ` (difference ${rupiah.format(Number(u.difference))})` : ""}</span>,
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
          <Link href={`/account/uang-dinas/${u.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
            Buka
          </Link>
          {u.status === "DIAJUKAN" ? (
            <button type="button" disabled={isPending} onClick={() => runAction(submitUangDinas(u.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
              Ajukan
            </button>
          ) : null}
          {u.status === "DISETUJUI" ? (
            <div className="inline-flex items-center gap-1">
              <input
                placeholder="Realisasi Rp"
                type="number"
                value={realisasi[u.id] ?? ""}
                onChange={(e) => setRealisasi((p) => ({ ...p, [u.id]: e.currentTarget.value }))}
                className="h-7 w-28 rounded-lg border border-blue-200 px-2 text-xs"
              />
              <input
                placeholder="URL bukti"
                value={bukti[u.id] ?? ""}
                onChange={(e) => setBukti((p) => ({ ...p, [u.id]: e.currentTarget.value }))}
                className="h-7 w-28 rounded-lg border border-blue-200 px-2 text-xs"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleLpj(u.id)}
                className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50 disabled:opacity-60"
              >
                LPJ
              </button>
            </div>
          ) : null}
          {["DIAJUKAN", "MENUNGGU_APPROVAL"].includes(u.status) ? (
            <button type="button" disabled={isPending} onClick={() => runAction(cancelUangDinas(u.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
              Batalkan
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Minta Uang Muka Dinas</h2>
        <p className="mt-1 text-xs text-slate-500">Hanya dari dinas yang sudah disetujui.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect name="dinas" label="Dinas" value={dutyId} onValueChange={setDinasId} options={dinasOptions} placeholder="Pilih dinas" searchable />
          <FloatingInput name="nominal" label="Nominal (Rp)" type="number" value={nominal} onChange={(e) => setNominal(e.currentTarget.value)} />
          <FloatingInput name="purpose" label="Keperluan" value={purpose} onChange={(e) => setKeperluan(e.currentTarget.value)} />
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleBuat}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              Buat
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <DataTable
            data={items}
            columns={kolomSaya}
            getRowId={(u) => u.id}
            emptyMessage="Belum ada."
          />
        </div>
      </div>
    </div>
  );
}
