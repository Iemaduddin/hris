import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getUangDinasDetail } from "@/src/modules/payroll/actions/uangdinas.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default async function UangDinasSayaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const karyawan = await prisma.karyawan.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!karyawan) notFound();

  const { id } = await params;
  const d = await getUangDinasDetail(id, session.user.id);
  if (!d || d.karyawanId !== karyawan.id) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{d.nomor}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {d.dinasNomor} • {d.status.replaceAll("_", " ")}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-4"><span className="text-slate-500">Uang muka</span><span className="font-medium">{rupiah.format(Number(d.nominalMuka))}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Realisasi</span><span className="font-medium">{d.totalRealisasi ? rupiah.format(Number(d.totalRealisasi)) : "-"}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Selisih</span><span className="font-medium">{d.selisih !== null ? rupiah.format(Number(d.selisih)) : "-"}</span></li>
        </ul>
      </div>
    </>
  );
}
