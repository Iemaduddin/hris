"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { processSubmissionAction } from "@/src/modules/approval/actions/approval.actions";
import { submitSwap, cancelSwap, createSwap, type SwapItem } from "@/src/modules/roster/actions/tukar.actions";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";

function kolomTukar(aksi: (t: SwapItem) => React.ReactNode): DataTableColumn<SwapItem>[] {
  return [
    {
      id: "date",
      header: "Tanggal",
      render: (t) => <span className="font-medium">{t.date}</span>,
      sortValue: (t) => t.date,
      searchValue: (t) => t.date,
    },
    { id: "lawan", header: "Lawan", accessor: "peerName" },
    {
      id: "shift",
      header: "Shift",
      sortable: false,
      searchValue: (t) => `${t.myShift} ${t.peerShift}`,
      render: (t) => <span className="text-xs">{t.myShift} → {t.peerShift}</span>,
    },
    {
      id: "status",
      header: "Status",
      render: (t) => <span>{t.status.replaceAll("_", " ")}</span>,
      sortValue: (t) => t.status,
      searchValue: (t) => t.status.replaceAll("_", " "),
    },
    {
      id: "aksi",
      header: "Aksi",
      headerClassName: "text-right",
      cellClassName: "text-right",
      sortable: false,
      searchable: false,
      render: aksi,
    },
  ];
}

function Tabel({ judul, items, emptyMessage, children }: { judul: string; items: SwapItem[]; emptyMessage?: string; children: (t: SwapItem) => React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{judul}</h2>
      <div className="mt-3">
        <DataTable
          data={items}
          columns={kolomTukar(children)}
          getRowId={(t) => t.id}
          emptyMessage={emptyMessage ?? "Kosong."}
        />
      </div>
    </div>
  );
}

export default function TukarListClient({
  userId,
  outgoing,
  incoming,
  pasanganOptions,
}: {
  userId: string;
  outgoing: SwapItem[];
  incoming: SwapItem[];
  pasanganOptions: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pasangan, setPasangan] = useState("");
  const [date, setTanggal] = useState("");
  const [alasan, setAlasan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ajukan Tukar Shift</h2>
        <p className="mt-1 text-xs text-slate-500">
          Tukar shift satu tanggal: disetujui pasangan dulu, lalu HR (roster langsung bertukar).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingSelect name="pasangan" label="Tukar Dengan" value={pasangan} onValueChange={setPasangan} options={pasanganOptions} placeholder="Pilih karyawan" searchable />
          <FloatingInput name="date" label="Tanggal" type="date" value={date} onChange={(e) => setTanggal(e.currentTarget.value)} />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                if (!pasangan || !date || !alasan.trim()) {
                  toast.error("Pasangan, tanggal, dan alasan wajib diisi.");
                  return;
                }
                runAction(createSwap({ partnerEmployeeId: pasangan, date, reason: alasan }, userId));
              }}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              Buat Draf
            </button>
          </div>
        </div>
      </div>

      <Tabel judul="Masuk Untuk Saya (perlu persetujuan saya)" items={incoming}>
        {(t) => (
          <div className="inline-flex gap-2">
            {t.status === "MENUNGGU_APPROVAL" ? (
              <>
                <button type="button" disabled={isPending} onClick={() => runAction(processSubmissionAction(userId, "TUKAR_SHIFT", t.id, "SETUJU"))} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  Setuju
                </button>
                <button type="button" disabled={isPending} onClick={() => { const note = prompt("Alasan penolakan:") ?? ""; if (!note) return; runAction(processSubmissionAction(userId, "TUKAR_SHIFT", t.id, "TOLAK", note)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                  Tolak
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        )}
      </Tabel>

      <Tabel judul="Pengajuan Saya" items={outgoing}>
        {(t) => (
          <div className="inline-flex gap-2">
            {t.status === "DRAFT" ? (
              <button type="button" disabled={isPending} onClick={() => runAction(submitSwap(t.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                Ajukan
              </button>
            ) : null}
            {["DRAFT", "DIAJUKAN"].includes(t.status) ? (
              <button type="button" disabled={isPending} onClick={() => runAction(cancelSwap(t.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                Batal
              </button>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        )}
      </Tabel>
    </div>
  );
}
