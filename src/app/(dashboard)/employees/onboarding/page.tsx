import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getOnboardingList, getOnboardingOptions, getTemplates } from "@/src/modules/employees/actions/onboarding.actions";
import OnboardingListClient from "@/src/modules/employees/components/onboarding-list-client";

export default async function OnboardingPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, templates, options] = await Promise.all([
    getOnboardingList(session.user.id),
    getTemplates(),
    getOnboardingOptions(session.user.id),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Onboarding Employee</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Template checklist → karyawan centang mandiri → atasan/HR verifikasi.
        </p>
      </div>

      <div className="mt-5">
        <OnboardingListClient userId={session.user.id} items={items} templates={templates} options={options} />
      </div>
    </>
  );
}
