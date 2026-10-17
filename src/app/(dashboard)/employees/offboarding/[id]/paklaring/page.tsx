import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { getEmploymentCertificate } from "@/src/modules/employee/actions/offboarding.actions";
import TombolCetak from "@/src/modules/employee/components/tombol-cetak";

const tanggalId = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default async function PaklaringPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const [slip, company] = await Promise.all([getEmploymentCertificate(id, session.user.id), getCompanyData()]);
  if (!slip) notFound();

  return (
    <>
      <div className="mb-5 flex justify-end print:hidden">
        <TombolCetak />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-10 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="text-center">
          <h1 className="text-xl font-bold">{company?.name ?? "Perusahaan"}</h1>
          <p className="text-sm">{[company?.address, company?.cityName].filter(Boolean).join(", ")}</p>
          <h2 className="mt-6 text-lg font-bold underline">SURAT KETERANGAN KERJA (PAKLARING)</h2>
          <p className="mt-1 text-sm">Nomor: {slip.number}</p>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="w-40 py-1 align-top">Nama</td><td className="py-1">: {slip.employeeName}</td></tr>
              <tr><td className="py-1 align-top">Nomor Karyawan</td><td className="py-1">: {slip.employeeNumber}</td></tr>
              <tr><td className="py-1 align-top">Terakhir menjabat</td><td className="py-1">: {slip.lastPosition}</td></tr>
              <tr><td className="py-1 align-top">Masa kerja</td><td className="py-1">: {tanggalId(slip.joinDate)} s/d {tanggalId(slip.resignDate)}</td></tr>
            </tbody>
          </table>
          <p>
            Telah bekerja dengan baik dan tidak memiliki tanggungan administrasi apa pun terhadap perusahaan.
            Surat ini dibuat untuk dipergunakan sebagaimana mestinya.
          </p>
        </div>

        <div className="mt-10 flex justify-end text-sm">
          <div className="text-center">
            <p>{company?.cityName ?? "Jakarta"}, {tanggalId(slip.resignDate)}</p>
            <p>Hormat kami,</p>
            <p className="mt-16 font-semibold underline">HRD</p>
          </div>
        </div>
      </div>
    </>
  );
}
