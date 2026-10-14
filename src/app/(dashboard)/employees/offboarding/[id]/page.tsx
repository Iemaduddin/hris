import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getOffboardingDetail } from "@/src/modules/employee/actions/offboarding.actions";
import OffboardingDetailClient from "@/src/modules/employee/components/offboarding-detail-client";

export default async function OffboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER", "FINANCE"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getOffboardingDetail(id, session.user.id);
  if (!detail) notFound();
  const bolehSelesaikan = role === "SUPER_ADMIN" || role === "ADMIN_HR";

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Resign {detail.karyawanNama}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.status.replaceAll("_", " ")}</p>
      </div>

      <div className="mt-5">
        <OffboardingDetailClient userId={session.user.id} detail={detail} bolehSelesaikan={bolehSelesaikan} />
      </div>
    </>
  );
}
