import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, isFinanceRole } from "@/src/lib/route-auth";
import { getDisburseSalaryRun } from "@/src/modules/payroll/actions/payroll.actions";
import { getDisburseThrRun } from "@/src/modules/payroll/actions/thr.actions";

/** GET ?runId= → CSV gaji; ?thrId= → CSV THR. Peran Finance. */
export async function GET(request: NextRequest) {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isFinanceRole(user.role)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const runId = request.nextUrl.searchParams.get("runId") ?? "";
  const thrId = request.nextUrl.searchParams.get("thrId") ?? "";
  const info = runId
    ? await getDisburseSalaryRun(runId)
    : thrId
      ? await getDisburseThrRun(thrId)
      : null;
  if (!info) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

  return new NextResponse(info.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${info.filename}"`,
    },
  });
}
