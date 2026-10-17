import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getUangDinasDetail } from "@/src/modules/payroll/actions/uangdinas.actions";

const rupiah = new Intl.NumberFormat("id-ID");

export default async function UangDinasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const d = await getUangDinasDetail(id, session.user.id);
  if (!d) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{d.number}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {d.employeeName} • {d.dutyNumber} • {d.status.replaceAll("_", " ")}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-4"><span className="text-slate-500">Uang muka</span><span className="font-medium">{rupiah.format(Number(d.advanceAmount))}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Realisasi</span><span className="font-medium">{d.actualTotal ? rupiah.format(Number(d.actualTotal)) : "-"}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Selisih</span><span className="font-medium">{d.difference !== null ? rupiah.format(Number(d.difference)) : "-"}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Dikembalikan</span><span className="font-medium">{d.refunded ? rupiah.format(Number(d.refunded)) : "-"}</span></li>
          <li className="flex justify-between gap-4"><span className="text-slate-500">Keperluan</span><span className="font-medium">{d.purpose ?? "-"}</span></li>
        </ul>
      </div>
    </>
  );
}
