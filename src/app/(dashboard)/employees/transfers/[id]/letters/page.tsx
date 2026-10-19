import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { getTransferDetail } from "@/src/modules/employees/actions/transfers.actions";
import TombolCetak from "@/src/modules/employees/components/print-button";

const tanggalId = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default async function TransferLetterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const [detail, company] = await Promise.all([getTransferDetail(id, session.user.id), getCompanyData()]);
  if (!detail || !["DISETUJUI", "DITERAPKAN"].includes(detail.status)) notFound();

  return (
    <>
      <div className="mb-5 flex justify-end print:hidden">
        <TombolCetak />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-10 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="text-center">
          <h1 className="text-xl font-bold">{company?.name ?? "Perusahaan"}</h1>
          {[company?.address, company?.cityName].filter(Boolean).join(", ") || null}
          <h2 className="mt-6 text-lg font-bold underline">
            SURAT KEPUTUSAN {detail.kind === "PROMOSI" ? "PROMOSI" : detail.kind === "DEMOSI" ? "DEMOSI" : "MUTASI"}
          </h2>
          <p className="mt-1 text-sm">Nomor: {detail.number}</p>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          <p>
            Berdasarkan persetujuan atasan langsung dan HR, dengan ini ditetapkan {detail.kindLabel.toLowerCase()}{" "}
            bagi karyawan berikut terhitung mulai tanggal {tanggalId(detail.effectiveDate)}:
          </p>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="w-40 py-1 align-top">Nama</td><td className="py-1">: {detail.employeeName}</td></tr>
              <tr><td className="py-1 align-top">Dari</td><td className="py-1">: {detail.from}</td></tr>
              <tr><td className="py-1 align-top">Menjadi</td><td className="py-1">: {detail.to}</td></tr>
              {detail.toSupervisorName ? (
                <tr><td className="py-1 align-top">Atasan baru</td><td className="py-1">: {detail.toSupervisorName}</td></tr>
              ) : null}
              <tr><td className="py-1 align-top">Alasan</td><td className="py-1">: {detail.reason}</td></tr>
            </tbody>
          </table>
          <p>
            Segala ketentuan kepegawaian yang melekat pada penempatan baru berlaku sejak tanggal efektif.
            Hal-hal yang belum diatur akan ditetapkan kemudian.
          </p>
        </div>

        <div className="mt-10 flex justify-between text-sm">
          <div className="text-center">
            <p>Employee yang bersangkutan,</p>
            <p className="mt-16 font-semibold underline">{detail.employeeName.split(" (")[0]}</p>
          </div>
          <div className="text-center">
            <p>
              {company?.cityName ?? "Jakarta"},{" "}
              {tanggalId(detail.appliedAt ?? new Date().toISOString())}
            </p>
            <p>Hormat kami,</p>
            <p className="mt-16 font-semibold underline">HRD</p>
          </div>
        </div>
      </div>
    </>
  );
}
