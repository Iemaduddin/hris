import { NextRequest, NextResponse } from "next/server";
import { getRouteUser } from "@/src/lib/route-auth";
import { getTemplateDetail } from "@/src/modules/employees/actions/letters.actions";

/** Detail template untuk form edit (HR). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN_HR") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const { id } = await params;
  const template = await getTemplateDetail(id);
  if (!template) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ template });
}
