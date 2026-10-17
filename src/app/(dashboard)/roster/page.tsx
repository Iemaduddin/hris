import { requireUserRole } from "@/src/lib/auth-guard";
import { getActiveEmployeeOptions } from "@/src/modules/recap/actions/recap.actions";
import { getActiveShiftOptions } from "@/src/modules/shift/actions/shift.actions";
import {
  listCalendarAssignments,
  listCalendarOptions,
  getRosterPeriod,
} from "@/src/modules/roster/actions/roster.actions";
import RosterClient from "@/src/modules/roster/components/roster-client";

function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; mulai?: string; selesai?: string }>;
}) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const params = await searchParams;
  const fallback = defaultRange();
  const start = params.start || params.mulai || fallback.start;
  const end = params.end || params.selesai || fallback.end;

  const [roster, assignments, employeeOptions, shiftOptions, calendarOptions] = await Promise.all([
    getRosterPeriod(start, end),
    listCalendarAssignments(),
    getActiveEmployeeOptions(),
    getActiveShiftOptions(),
    listCalendarOptions(),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Roster & Penugasan</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Penugasan kalender untuk pola reguler, roster shift untuk pola bergilir/malam.
        </p>
      </div>

      <div className="mt-5">
        <RosterClient
          start={start}
          end={end}
          roster={roster}
          assignments={assignments}
          employeeOptions={employeeOptions}
          shiftOptions={shiftOptions}
          calendarOptions={calendarOptions}
        />
      </div>
    </>
  );
}
