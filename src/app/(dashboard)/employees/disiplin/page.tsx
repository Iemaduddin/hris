import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getDisiplinList } from "@/src/modules/employee/actions/disiplin.actions";
import DisiplinListClient from "@/src/modules/employee/components/disiplin-list-client";

export default async function DisiplinPage() {
  const { role } = await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, karyawan] = await Promise.all([
    getDisiplinList(session.user.id),
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true, atasanLangsungId: true },
    }),
  ]);
  const saya = await prisma.karyawan.findFirst({ where: { userId: session.user.id }, select: { id: true } });
  const isHr = role === "SUPER_ADMIN" || role === "ADMIN_HR";
  const opsi = karyawan
    .filter((k) => isHr || k.atasanLangsungId === saya?.id)
    .map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }));

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Disiplin / SP</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          SP1 → SP2 → SP3 → Skorsing → PHK. Diterbitkan HR; berlaku 6 bulan.
        </p>
      </div>

      <div className="mt-5">
        <DisiplinListClient userId={session.user.id} items={items} karyawanOptions={opsi} bolehTerbit={isHr} />
      </div>
    </>
  );
}
