import { redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getTimHariIni } from "@/src/modules/employee/actions/team.actions";
import Link from "next/link";

const hariIniIso = () => {
  const kini = new Date();
  return `${kini.getFullYear()}-${String(kini.getMonth() + 1).padStart(2, "0")}-${String(kini.getDate()).padStart(2, "0")}`;
};

export default async function TimPage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string }>;
}) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { tanggal } = await searchParams;
  const tgl = tanggal ?? hariIniIso();
  const anggota = await getTimHariIni(session.user.id, tgl);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Tim Saya</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Kehadiran, shift, dan cuti/dinas tim pada tanggal dipilih.
            </p>
          </div>
          <form className="flex items-end gap-2">
            <input
              type="date"
              name="tanggal"
              defaultValue={tgl}
              className="h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm dark:border-blue-900/60 dark:bg-slate-900"
            />
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
              Lihat
            </button>
          </form>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Shift</th>
                <th className="px-4 py-3 text-left font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {anggota.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Belum ada anggota tim. <Link href="/employees" className="text-blue-600 hover:underline">Kelola karyawan</Link>
                  </td>
                </tr>
              ) : (
                anggota.map((a) => (
                  <tr key={a.karyawanId} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3">{a.nama} <span className="text-xs text-slate-500">({a.nomorKaryawan})</span></td>
                    <td className="px-4 py-3 font-medium">{a.status}</td>
                    <td className="px-4 py-3">{a.shift ?? "-"}</td>
                    <td className="px-4 py-3">{a.info ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
