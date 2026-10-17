import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getApprovedDutyOptions, listUangDinas } from "@/src/modules/payroll/actions/uangdinas.actions";
import prisma from "@/src/lib/prisma";
import UangDinasListClient from "@/src/modules/payroll/components/uangdinas-list-client";

export default async function UangDinasPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, dinasOptions, karyawan] = await Promise.all([
    listUangDinas(),
    getApprovedDutyOptions(),
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Uang Dinas</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Uang muka → LPJ → sisa kembali/potong gaji, kurang jadi reimbursement.
        </p>
      </div>

      <div className="mt-5">
        <UangDinasListClient
          userId={session.user.id}
          items={items}
          dinasOptions={dinasOptions}
          karyawanOptions={karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }))}
        />
      </div>
    </>
  );
}
