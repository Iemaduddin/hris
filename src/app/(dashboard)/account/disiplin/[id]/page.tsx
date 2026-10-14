import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getDisiplinDetail } from "@/src/modules/employee/actions/disiplin.actions";

export default async function DisiplinSayaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const karyawan = await prisma.karyawan.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!karyawan) notFound();

  const { id } = await params;
  const detail = await getDisiplinDetail(id, session.user.id);
  if (!detail || detail.karyawanId !== karyawan.id) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {detail.tingkatLabel} {detail.nomor}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.judul}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-4"><span className="text-slate-500">Pelanggaran</span><span className="text-right font-medium">{detail.pelanggaran}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Terbit</span><span className="font-medium">{detail.tanggalTerbit}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Berlaku s/d</span><span className="font-medium">{detail.berlakuSampai ?? "-"}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Status</span><span className="font-medium">{detail.status.replaceAll("_", " ")}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Ditandatangani</span><span className="font-medium">{detail.ttdKaryawanPada ? new Date(detail.ttdKaryawanPada).toLocaleString("id-ID") : "Belum — gunakan tombol di daftar"}</span></li>
        </ul>
      </div>
    </>
  );
}
