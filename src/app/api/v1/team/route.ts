import { NextRequest } from "next/server";
import { fail, isHr, ok, requireApiSession } from "@/src/lib/api-v1";
import { dateOnlyInput } from "@/src/lib/time";
import { getTeamOverview } from "@/src/modules/employee/actions/team.actions";

/**
 * GET: tim saya — siapa cuti/dinas hari ini + direktori bawahan
 * (kontak/penempatan saja, tanpa data sensitif). Manajer/HR.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiSession(request);
  if (!ctx) return fail("Unauthorized.", 401);
  if (ctx.role !== "MANAJER" && !isHr(ctx)) return fail("Khusus manajer/HR.", 403);

  const date = dateOnlyInput(new Date());
  const members = await getTeamOverview(ctx.userId, date);
  return ok({
    date,
    count: members.length,
    onLeave: members.filter((m) => m.info !== null),
    members,
  });
}
