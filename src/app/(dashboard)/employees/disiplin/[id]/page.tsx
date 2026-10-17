import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getDisiplinDetail } from "@/src/modules/employee/actions/disiplin.actions";
import DisiplinDetailClient from "@/src/modules/employee/components/disiplin-detail-client";

export default async function DisiplinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getDisiplinDetail(id, session.user.id);
  if (!detail) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {detail.levelLabel} {detail.number}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.employeeName}</p>
      </div>

      <div className="mt-5">
        <DisiplinDetailClient
          userId={session.user.id}
          detail={detail}
          bolehTerbit={role === "SUPER_ADMIN" || role === "ADMIN_HR"}
        />
      </div>
    </>
  );
}
