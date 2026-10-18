import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { listSalaryAdvances } from "@/src/modules/payroll/actions/kasbon.actions";
import KasbonListClient from "@/src/modules/payroll/components/kasbon-list-client";

export default async function KasbonPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
  const session = await getCurrentSession();
  const [items, karyawan] = await Promise.all([
    listSalaryAdvances(),
    prisma.karyawan.findMany({
      where: { status: { in: ["AKTIF", "PROBASI"] } },
      orderBy: { namaLengkap: "asc" },
      select: { id: true, namaLengkap: true, nomorKaryawan: true },
    }),
  ]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kasbon Karyawan</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Pengajuan → persetujuan Finance → potong otomatis tiap salary run. Hitung-ulang run memulihkan sisa lalu memotong lagi (idempoten).
        </p>
      </div>

      <div className="mt-5">
        <KasbonListClient
          items={items}
          userId={session?.user.id ?? ""}
          karyawanOptions={karyawan.map((k) => ({ value: k.id, label: `${k.namaLengkap} (${k.nomorKaryawan})` }))}
        />
      </div>
    </>
  );
}
