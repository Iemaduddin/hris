import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getOnboardingDetail } from "@/src/modules/employees/actions/onboarding.actions";
import OnboardingDetailClient from "@/src/modules/employees/components/onboarding-detail-client";

export default async function OnboardingSayaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const karyawan = await prisma.karyawan.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!karyawan) notFound();

  const { id } = await params;
  const detail = await getOnboardingDetail(id, session.user.id);
  if (!detail || detail.employeeId !== karyawan.id) notFound();

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Checklist {detail.templateName ?? "Onboarding"}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Centang yang sudah selesai — atasan/HR akan memverifikasi.
        </p>
      </div>

      <div className="mt-5">
        <OnboardingDetailClient userId={session.user.id} detail={detail} bolehVerifikasi={false} bolehKelolaHr={false} />
      </div>
    </>
  );
}
