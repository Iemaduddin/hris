"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import {
  ajukanMutasi,
  batalkanMutasi,
  buatMutasi,
  hapusMutasi,
  type MutasiItem,
  type MutasiOption,
} from "../actions/mutasi.actions";

const JENIS_OPTIONS = [
  { value: "MUTASI", label: "Mutasi (lateral)" },
  { value: "PROMOSI", label: "Promosi" },
  { value: "DEMOSI", label: "Demosi" },
];

export default function MutasiListClient({
  userId,
  items,
  options,
}: {
  userId: string;
  items: MutasiItem[];
  options: {
    karyawan: MutasiOption[];
    units: MutasiOption[];
    positions: MutasiOption[];
    locations: MutasiOption[];
    atasan: MutasiOption[];
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [karyawanId, setKaryawanId] = useState("");
  const [jenis, setJenis] = useState("MUTASI");
  const [keUnit, setKeUnit] = useState("");
  const [kePosisi, setKePosisi] = useState("");
  const [keLokasi, setKeLokasi] = useState("");
  const [keAtasan, setKeAtasan] = useState("");
  const [efektif, setEfektif] = useState("");
  const [alasan, setAlasan] = useState("");

  function runAction(action: Promise<{ success: boolean; message: string; id?: string }>) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function handleBuat() {
    if (!karyawanId || !efektif || !alasan.trim()) {
      toast.error("Karyawan, tanggal efektif, dan alasan wajib diisi.");
      return;
    }
    if (!keUnit && !kePosisi && !keLokasi) {
      toast.error("Isi minimal satu tujuan (unit/posisi/lokasi).");
      return;
    }
    runAction(
      buatMutasi(
        {
          karyawanId,
          jenis,
          keUnitId: keUnit,
          kePosisiId: kePosisi,
          keLokasiId: keLokasi,
          keAtasanId: keAtasan,
          tanggalEfektif: efektif,
          alasan,
        },
        userId,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usulkan Mutasi / Promosi / Demosi</h2>
        <p className="mt-1 text-xs text-slate-500">
          Draf → diajukan ke atasan langsung karyawan → HR → diterapkan HR (riwayat penempatan append-only).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FloatingSelect name="karyawan" label="Karyawan" value={karyawanId} onValueChange={setKaryawanId} options={options.karyawan} placeholder="Pilih karyawan" searchable />
          <FloatingSelect name="jenis" label="Jenis" value={jenis} onValueChange={setJenis} options={JENIS_OPTIONS} searchable={false} />
          <FloatingInput name="efektif" label="Tanggal Efektif" type="date" value={efektif} onChange={(e) => setEfektif(e.currentTarget.value)} />
          <FloatingSelect name="keUnit" label="Unit Tujuan" value={keUnit} onValueChange={setKeUnit} options={options.units} placeholder="Tetap" searchable />
          <FloatingSelect name="kePosisi" label="Posisi Tujuan" value={kePosisi} onValueChange={setKePosisi} options={options.positions} placeholder="Tetap" searchable />
          <FloatingSelect name="keLokasi" label="Lokasi Tujuan" value={keLokasi} onValueChange={setKeLokasi} options={options.locations} placeholder="Tetap" searchable />
          <FloatingSelect name="keAtasan" label="Atasan Baru (opsional)" value={keAtasan} onValueChange={setKeAtasan} options={options.atasan} placeholder="Tetap" searchable />
          <FloatingInput name="alasan" label="Alasan" value={alasan} onChange={(e) => setAlasan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleBuat} disabled={isPending} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70">
            Buat Draf
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Nomor</th>
                <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-left font-semibold">Jenis</th>
                <th className="px-4 py-3 text-left font-semibold">Dari → Ke</th>
                <th className="px-4 py-3 text-left font-semibold">Efektif</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">Belum ada usulan.</td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3 font-medium">{m.nomor}</td>
                    <td className="px-4 py-3">{m.karyawanNama}</td>
                    <td className="px-4 py-3">{m.jenisLabel}</td>
                    <td className="px-4 py-3 text-xs">{m.dari} → {m.ke}</td>
                    <td className="px-4 py-3">{m.tanggalEfektif}</td>
                    <td className="px-4 py-3">{m.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link href={`/employees/mutasi/${m.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                          Buka
                        </Link>
                        {m.status === "DRAFT" ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(ajukanMutasi(m.id, userId))} className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                            Ajukan
                          </button>
                        ) : null}
                        {["DRAFT", "DIAJUKAN"].includes(m.status) ? (
                          <button type="button" disabled={isPending} onClick={() => runAction(batalkanMutasi(m.id, userId))} className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                            Batal
                          </button>
                        ) : null}
                        {["DRAFT", "DITOLAK", "DIBATALKAN"].includes(m.status) ? (
                          <button type="button" disabled={isPending} onClick={() => { if (!confirm("Hapus usulan ini?")) return; runAction(hapusMutasi(m.id, userId)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60">
                            Hapus
                          </button>
                        ) : null}
                      </div>
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
