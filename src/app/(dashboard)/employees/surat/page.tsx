import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getSuratList, getTerbitOptions } from "@/src/modules/employee/actions/surat.actions";
import SuratTerbitClient from "@/src/modules/employee/components/surat-terbit-client";

export default async function SuratPage() {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [items, options] = await Promise.all([getSuratList(), getTerbitOptions()]);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Surat Keluar</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Nomor formal otomatis + QR verifikasi publik.
        </p>
      </div>

      <div className="mt-5">
        <SuratTerbitClient
          userId={session.user.id}
          items={items}
          refs={options.refs}
          karyawans={options.karyawans}
          templates={options.templates}
        />
      </div>
    </>
  );
}
