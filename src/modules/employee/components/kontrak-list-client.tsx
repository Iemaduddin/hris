"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { perpanjangKontrakBatch } from "../actions/kontrak.actions";
import type { KontrakMasaBerakhirItem } from "../actions/employee.actions";

const JENIS_OPTIONS = [
  { value: "PKWT", label: "PKWT" },
  { value: "PKWTT", label: "PKWTT" },
  { value: "MAGANG", label: "Magang" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "OUTSOURCING", label: "Outsourcing" },
];

export default function KontrakListClient({
  userId,
  items,
}: {
  userId: string;
  items: KontrakMasaBerakhirItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<string[]>([]);
  const [selesai, setSelesai] = useState("");
  const [jenis, setJenis] = useState("PKWT");
  const [gapok, setGapok] = useState("");
  const [catatan, setCatatan] = useState("");

  function toggle(id: string) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBatch() {
    if (checked.length === 0) {
      toast.error("Pilih minimal satu kontrak.");
      return;
    }
    if (!selesai) {
      toast.error("Tanggal selesai baru wajib diisi.");
      return;
    }
    if (!confirm(`Perpanjang ${checked.length} kontrak? Kontrak lama BERAKHIR, kontrak baru AKTIF bernomor otomatis.`)) return;
    startTransition(async () => {
      const result = await perpanjangKontrakBatch(
        { kontrakIds: checked, tanggalSelesai: selesai, jenisKontrak: jenis, gajiPokok: gapok, catatan },
        userId,
      );
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setChecked([]);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Perpanjangan Massal {checked.length > 0 ? `(${checked.length} dipilih)` : ""}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Append-only: kontrak lama ditutup (BERAKHIR), kontrak baru AKTIF dengan nomor otomatis.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <FloatingInput name="selesai" label="Selesai Baru" type="date" value={selesai} onChange={(e) => setSelesai(e.currentTarget.value)} />
          <FloatingSelect name="jenis" label="Jenis Baru" value={jenis} onValueChange={setJenis} options={JENIS_OPTIONS} searchable={false} />
          <FloatingInput name="gapok" label="Gapok Baru (kosong = ikut lama)" type="number" value={gapok} onChange={(e) => setGapok(e.currentTarget.value)} />
          <FloatingInput name="catatan" label="Catatan" value={catatan} onChange={(e) => setCatatan(e.currentTarget.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleBatch} disabled={isPending || checked.length === 0} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            Perpanjang Terpilih
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Akan Berakhir (H-60)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Pilih</th>
                <th className="px-4 py-3 text-left font-semibold">Kontrak</th>
                <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
                <th className="px-4 py-3 text-left font-semibold">Selesai</th>
                <th className="px-4 py-3 text-right font-semibold">Sisa</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Tidak ada kontrak mendekati akhir.</td>
                </tr>
              ) : (
                items.map((k) => (
                  <tr key={k.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={checked.includes(k.id)} onChange={() => toggle(k.id)} className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 font-medium">{k.nomorKontrak} <span className="text-xs text-slate-500">({k.jenisKontrak})</span></td>
                    <td className="px-4 py-3">{k.karyawanNama}</td>
                    <td className="px-4 py-3">{k.tanggalSelesai.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right">H-{k.sisaHari}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/employees/kontrak/${k.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                        Buka
                      </Link>
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
