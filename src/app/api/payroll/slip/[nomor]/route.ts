import { NextRequest, NextResponse } from "next/server";
import { getRouteUser, isFinanceRole } from "@/src/lib/route-auth";
import { unduhPdfSlipGaji } from "@/src/modules/payroll/lib/slip-unduh";

function baseUrl(request: NextRequest): string {
  return process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? request.nextUrl.origin;
}

/** PDF slip gaji (Finance; pratinjau FINAL diizinkan). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ nomor: string }> }) {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isFinanceRole(user.role)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const { nomor } = await params;
  const hasil = await unduhPdfSlipGaji(decodeURIComponent(nomor), { baseUrl: baseUrl(request) });
  if (!hasil) return NextResponse.json({ error: "Slip tidak ditemukan." }, { status: 404 });

  return new NextResponse(Buffer.from(hasil.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${hasil.filename}"`,
    },
  });
}
