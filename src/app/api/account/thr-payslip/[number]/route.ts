import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { getRouteUser } from "@/src/lib/route-auth";
import { unduhPdfSlipThr } from "@/src/modules/payroll/lib/slip-unduh";

function baseUrl(request: NextRequest): string {
  return process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? request.nextUrl.origin;
}

/** PDF slip THR milik sendiri (ESS). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const karyawan = await prisma.karyawan.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!karyawan) return NextResponse.json({ error: "Akun belum tertaut ke data karyawan." }, { status: 403 });

  const { number } = await params;
  const hasil = await unduhPdfSlipThr(decodeURIComponent(number), {
    onlyKaryawanId: karyawan.id,
    baseUrl: baseUrl(request),
  });
  if (!hasil) return NextResponse.json({ error: "Slip tidak ditemukan." }, { status: 404 });

  return new NextResponse(Buffer.from(hasil.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${hasil.filename}"`,
    },
  });
}
