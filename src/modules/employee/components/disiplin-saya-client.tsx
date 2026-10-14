"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { ackDisiplin } from "@/src/modules/employee/actions/disiplin.actions";

export default function DisiplinSayaClient({
  userId,
  items,
}: {
  userId: string;
  items: Array<{
    id: string;
    nomor: string;
    tingkatLabel: string;
    judul: string;
    tanggalTerbit: string;
    aktif: boolean;
    status: string;
  }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-blue-100 dark:border-blue-900/60">
              <th className="px-4 py-3 text-left font-semibold">Surat</th>
              <th className="px-4 py-3 text-left font-semibold">Judul</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Tidak ada surat peringatan.</td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="border-b border-blue-100 dark:border-blue-900/60">
                  <td className="px-4 py-3 font-medium">{d.tingkatLabel} • {d.nomor}</td>
                  <td className="px-4 py-3">{d.judul}</td>
                  <td className="px-4 py-3">{d.status.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link href={`/account/disiplin/${d.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                        Baca
                      </Link>
                      {d.status === "DITERBITKAN" ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (!confirm("Tandai sudah dibaca dan dipahami?")) return;
                            startTransition(async () => {
                              const r = await ackDisiplin(d.id, userId);
                              if (!r.success) toast.error(r.message);
                              else toast.success(r.message);
                              router.refresh();
                            });
                          }}
                          className="rounded-lg border border-emerald-200 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          Tanda Tangani
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
  );
}
