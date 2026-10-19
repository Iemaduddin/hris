import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getTodayTeam } from "@/src/modules/employees/actions/team.actions";
import TeamTable from "./team-table";

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { tanggal } = await searchParams;
  const date = tanggal ?? todayIso();
  const members = await getTodayTeam(session.user.id, date);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Tim Saya</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Kehadiran, shift, dan cuti/dinas tim pada tanggal dipilih.
            </p>
          </div>
          <form className="flex items-end gap-2">
            <input
              type="date"
              name="tanggal"
              defaultValue={date}
              className="h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm dark:border-blue-900/60 dark:bg-slate-900"
            />
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
              Lihat
            </button>
          </form>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="mt-2">
          <TeamTable members={members} />
        </div>
      </div>
    </>
  );
}
