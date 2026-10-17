import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getOnboardingDetail } from "@/src/modules/employee/actions/onboarding.actions";
import OnboardingDetailClient from "@/src/modules/employee/components/onboarding-detail-client";

export default async function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getOnboardingDetail(id, session.user.id);
  if (!detail) notFound();
  const isHr = role === "SUPER_ADMIN" || role === "ADMIN_HR";

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Onboarding {detail.employeeName}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.templateName ?? "Kustom"}</p>
      </div>

      <div className="mt-5">
        <OnboardingDetailClient
          userId={session.user.id}
          detail={detail}
          bolehVerifikasi={isHr || role === "MANAJER"}
          bolehKelolaHr={isHr}
        />
      </div>
    </>
  );
}
