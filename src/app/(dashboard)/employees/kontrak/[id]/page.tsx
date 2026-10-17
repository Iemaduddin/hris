import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getKontrakDetail } from "@/src/modules/employee/actions/kontrak.actions";
import KontrakDetailClient from "@/src/modules/employee/components/kontrak-detail-client";

export default async function KontrakDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getKontrakDetail(id);
  if (!detail) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kontrak {detail.contractNumber}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.employeeName}</p>
      </div>

      <div className="mt-5">
        <KontrakDetailClient userId={session.user.id} employeeId={detail.employeeId} detail={detail} />
      </div>
    </>
  );
}
