import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getMyOffboarding } from "@/src/modules/employees/actions/offboarding.actions";
import OffboardingSayaClient from "@/src/modules/employees/components/offboarding-saya-client";

export default async function OffboardingSayaPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const karyawan = await prisma.karyawan.findFirst({
    where: { userId: session.user.id },
    select: { id: true, namaLengkap: true },
  });
  if (!karyawan) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h1 className="text-2xl font-semibold">Pengajuan Resign</h1>
        <p className="mt-2 text-sm">Akun belum tertaut ke data karyawan. Hubungi HR.</p>
      </div>
    );
  }

  const items = await getMyOffboarding(karyawan.id);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan Resign</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{karyawan.namaLengkap}</p>
      </div>

      <div className="mt-5">
        <OffboardingSayaClient userId={session.user.id} employeeId={karyawan.id} items={items} />
      </div>
    </>
  );
}
