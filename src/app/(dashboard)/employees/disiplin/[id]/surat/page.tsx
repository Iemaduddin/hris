import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { getDisiplinDetail } from "@/src/modules/employee/actions/disiplin.actions";
import TombolCetak from "@/src/modules/employee/components/tombol-cetak";

const tanggalId = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default async function SuratDisiplinPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const [detail, company] = await Promise.all([getDisiplinDetail(id, session.user.id), getCompanyData()]);
  if (!detail || detail.status === "DRAFT") notFound();

  return (
    <>
      <div className="mb-5 flex justify-end print:hidden">
        <TombolCetak />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-10 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="text-center">
          <h1 className="text-xl font-bold">{company?.name ?? "Perusahaan"}</h1>
          <p className="text-sm">{[company?.address, company?.cityName].filter(Boolean).join(", ")}</p>
          <h2 className="mt-6 text-lg font-bold underline">
            {detail.tingkat === "PHK"
              ? "SURAT KEPUTUSAN PEMUTUSAN HUBUNGAN KERJA"
              : detail.tingkat === "SKORSING"
                ? "SURAT KEPUTUSAN SKORSING"
                : `SURAT PERINGATAN ${detail.tingkat.replace("SP", "")}`}
          </h2>
          <p className="mt-1 text-sm">Nomor: {detail.nomor}</p>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          <p>
            Berdasarkan pelanggaran disiplin kerja, dengan ini diberikan <strong>{detail.tingkatLabel}</strong> kepada:
          </p>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="w-40 py-1 align-top">Nama</td><td className="py-1">: {detail.karyawanNama}</td></tr>
              <tr><td className="py-1 align-top">Pelanggaran</td><td className="py-1">: {detail.pelanggaran}</td></tr>
              <tr><td className="py-1 align-top">Berlaku</td><td className="py-1">: {tanggalId(detail.tanggalTerbit)}{detail.berlakuSampai ? ` s/d ${tanggalId(detail.berlakuSampai)}` : ""}</td></tr>
              {detail.tanggalSkorsingMulai ? (
                <tr><td className="py-1 align-top">Masa skorsing</td><td className="py-1">: {tanggalId(detail.tanggalSkorsingMulai)} s/d {tanggalId(detail.tanggalSkorsingSelesai ?? detail.tanggalSkorsingMulai)}</td></tr>
              ) : null}
            </tbody>
          </table>
          <p>
            {detail.tingkat === "PHK"
              ? "Hubungan kerja dinyatakan berakhir sesuai ketentuan yang berlaku."
              : "Diharapkan tidak mengulangi pelanggaran. Pelanggaran berikutnya berakibat pada tingkat yang lebih berat."}
          </p>
          {detail.ttdKaryawanPada ? (
            <p>Dokumen ini telah dibaca dan ditandatangani karyawan pada {new Date(detail.ttdKaryawanPada).toLocaleString("id-ID")}.</p>
          ) : null}
        </div>

        <div className="mt-10 flex justify-between text-sm">
          <div className="text-center">
            <p>Karyawan yang bersangkutan,</p>
            <p className="mt-16 font-semibold underline">{detail.ttdKaryawanNama ?? detail.karyawanNama.split(" (")[0]}</p>
          </div>
          <div className="text-center">
            <p>{company?.cityName ?? "Jakarta"}, {tanggalId(detail.tanggalTerbit)}</p>
            <p>Hormat kami,</p>
            <p className="mt-16 font-semibold underline">HRD</p>
          </div>
        </div>
      </div>
    </>
  );
}
