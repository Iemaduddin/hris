import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { getSuratDetail } from "@/src/modules/employee/actions/surat.actions";
import TombolCetak from "@/src/modules/employee/components/tombol-cetak";

export default async function SuratDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserRole(["SUPER_ADMIN", "ADMIN_HR"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const baseUrl = process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "";
  const { id } = await params;
  const [detail, company] = await Promise.all([getSuratDetail(id, baseUrl), getCompanyData()]);
  if (!detail) notFound();
  const qr = await QRCode.toDataURL(detail.verifyUrl, { width: 200, margin: 1 });

  return (
    <>
      <div className="mb-5 flex justify-end print:hidden">
        <TombolCetak />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-10 dark:border-blue-900/60 dark:bg-slate-900">
        <div className="text-center">
          <h1 className="text-xl font-bold">{company?.name ?? "Perusahaan"}</h1>
          <p className="text-sm">{[company?.address, company?.cityName].filter(Boolean).join(", ")}</p>
          <h2 className="mt-6 text-lg font-bold underline">{detail.judul.toUpperCase()}</h2>
          <p className="mt-1 text-sm">Nomor: {detail.nomor}</p>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          {detail.isi.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-10 flex items-end justify-between text-sm">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR verifikasi" width={110} height={110} />
            <p className="mt-1 text-xs text-slate-500">Kode: {detail.kodeVerifikasi}</p>
          </div>
          <div className="text-center">
            <p>{company?.cityName ?? "Jakarta"}, {detail.tanggal}</p>
            <p>Hormat kami,</p>
            <p className="mt-16 font-semibold underline">HRD</p>
          </div>
        </div>
      </div>
    </>
  );
}
