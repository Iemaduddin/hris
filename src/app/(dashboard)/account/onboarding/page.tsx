import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { getOnboardingSaya } from "@/src/modules/employee/actions/onboarding.actions";
import Link from "next/link";

export default async function OnboardingSayaPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const karyawan = await prisma.karyawan.findFirst({
    where: { userId: session.user.id },
    select: { id: true, namaLengkap: true },
  });
  if (!karyawan) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h1 className="text-2xl font-semibold">Onboarding Saya</h1>
        <p className="mt-2 text-sm">Akun belum tertaut ke data karyawan. Hubungi HR.</p>
      </div>
    );
  }

  const items = await getOnboardingSaya(karyawan.id);

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Onboarding Saya</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{karyawan.namaLengkap}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 dark:border-blue-900/60">
                <th className="px-4 py-3 text-left font-semibold">Checklist</th>
                <th className="px-4 py-3 text-right font-semibold">Progres</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Tidak ada onboarding.</td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="border-b border-blue-100 dark:border-blue-900/60">
                    <td className="px-4 py-3 font-medium">{o.templateNama ?? "Kustom"}</td>
                    <td className="px-4 py-3 text-right">{o.persen}% ({o.wajibSelesai} wajib)</td>
                    <td className="px-4 py-3">{o.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/account/onboarding/${o.id}`} className="rounded-lg border border-blue-200 px-3 py-1 text-xs hover:bg-blue-50">
                        Buka
                      </Link>
                    </td>
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
