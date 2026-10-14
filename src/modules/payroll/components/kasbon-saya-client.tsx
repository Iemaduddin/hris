"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
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
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Nomor</th>
                <th className="px-4 py-3 text-right font-semibold">Nominal</th>
                <th className="px-4 py-3 text-right font-semibold">Angsuran</th>
                <th className="px-4 py-3 text-right font-semibold">Sisa</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada pengajuan.</td>
                </tr>
              ) : (
                items.map((k) => (
                  <tr key={k.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3 font-medium">{k.nomor}</td>
                    <td className="px-4 py-3 text-right">{rupiah.format(Number(k.nominal))}</td>
                    <td className="px-4 py-3 text-right">{rupiah.format(Number(k.angsuranPerBulan))} × {k.tenorBulan}</td>
                    <td className="px-4 py-3 text-right font-semibold">{rupiah.format(Number(k.sisaHutang))}</td>
                    <td className="px-4 py-3">{k.status.replaceAll("_", " ")}{k.angsuranKe > 0 ? ` (${k.angsuranKe}x)` : ""}</td>
                    <td className="px-4 py-3 text-right">
                      {["DRAFT", "DIAJUKAN"].includes(k.status) ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => startTransition(async () => {
                            const r = await batalkanKasbon(k.id, karyawanId);
                            if (!r.success) toast.error(r.message);
                            else toast.success(r.message);
                            router.refresh();
                          })}
                          className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                        >
                          Batalkan
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
