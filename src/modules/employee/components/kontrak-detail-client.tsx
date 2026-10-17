"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { deleteSignature, addSignature, type KontrakDetailView } from "../actions/kontrak.actions";

const rupiah = new Intl.NumberFormat("id-ID");

const PIHAK_OPTIONS = [
  { value: "HRD", label: "HRD" },
  { value: "KARYAWAN", label: "Karyawan" },
];

export default function KontrakDetailClient({
  userId,
  employeeId,
  detail,
}: {
  userId: string;
  employeeId: string;
  detail: KontrakDetailView;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pihak, setPihak] = useState("HRD");
  const [nama, setNama] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function refresh(ok: boolean, message: string) {
    if (!ok) toast.error(message);
    else toast.success(message);
    router.refresh();
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih file tanda tangan (gambar/PDF).");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("ownerType", "karyawan");
        fd.set("ownerId", employeeId);
        fd.set("subfolder", "kontrak");
        fd.set("jenis", "KONTRAK_KERJA");
        fd.set("file", file);
        const res = await fetch("/api/files", { method: "POST", body: fd });
        const body = (await res.json()) as { success?: boolean; path?: string; error?: string };
        if (!res.ok || !body.success || !body.path) {
          toast.error(body.error ?? "Upload gagal.");
          return;
        }
        const simpan = await addSignature(
          { contractId: detail.id, party: pihak, signerName: nama, fileUrl: body.path },
          userId,
        );
        refresh(simpan.success, simpan.message);
        if (simpan.success) {
          setFile(null);
          setNama("");
        }
      } catch {
        toast.error("Upload gagal.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {detail.contractNumber} • {detail.contractType} • {detail.status.replaceAll("_", " ")}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {detail.employeeName} • {detail.startDate} s/d {detail.endDate ?? "-"}
          {detail.baseSalary ? ` • Rp${rupiah.format(Number(detail.baseSalary))}` : ""}
        </p>
        {detail.note ? <p className="mt-1 text-sm text-slate-500">{detail.note}</p> : null}
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-3 inline-flex h-9 items-center rounded-lg border border-blue-200 px-3 text-sm hover:bg-blue-50 print:hidden"
        >
          Cetak
        </button>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tanda Tangan</h2>
        {detail.signatures.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Belum ada tanda tangan.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {detail.signatures.map((t) => (
              <li key={t.party} className="rounded-xl border border-blue-100 p-3 dark:border-blue-900/60">
                <p className="text-sm font-semibold">{t.party}{t.signerName ? ` — ${t.signerName}` : ""}</p>
                <p className="text-xs text-slate-500">{new Date(t.signedAt).toLocaleString("id-ID")}</p>
                {t.fileUrl.toLowerCase().endsWith(".pdf") ? (
                  <a href={`/api/files/${t.fileUrl}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                    Buka PDF
                  </a>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/api/files/${t.fileUrl}`} alt={`TTD ${t.party}`} className="mt-2 max-h-32 rounded border" />
                )}
                <div className="mt-2 print:hidden">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm("Hapus tanda tangan ini?")) return;
                      startTransition(async () => {
                        const r = await deleteSignature(detail.id, t.party, userId);
                        refresh(r.success, r.message);
                      });
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-blue-100 pt-4 md:grid-cols-4 dark:border-blue-900/60 print:hidden">
          <FloatingSelect name="party" label="Pihak" value={pihak} onValueChange={setPihak} options={PIHAK_OPTIONS} searchable={false} />
          <FloatingInput name="nama" label="Nama Penanda" value={nama} onChange={(e) => setNama(e.currentTarget.value)} />
          <div className="flex flex-col gap-1">
            <label htmlFor="ttd-file" className="text-xs font-medium text-slate-500">File (gambar/PDF)</label>
            <input
              id="ttd-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={handleUpload} disabled={isPending || !file} className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              Unggah & Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
