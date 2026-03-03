import { getCompanyData, getCompanyLocationOptions } from "@/src/modules/company-data/actions/company-data.actions";
import CompanyDataForm from "@/src/modules/company-data/components/company-data-form";
import CompanyLogoUpload from "@/src/modules/company-data/components/company-logo-upload";

function displayValue(value?: string | null) {
    if (!value || !value.trim()) return "-";
    return value;
}

export default async function CompanyDataPage() {
    const [company, locationOptions] = await Promise.all([getCompanyData(), getCompanyLocationOptions()]);
    return (
        <>
            <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Informasi Perusahaan</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kelola informasi perusahaan</p>
            </div>


            <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Form Data Perusahaan</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ubah data di bawah lalu simpan.</p>
                    <CompanyLogoUpload companyId={company?.id} logo={company?.logo} />

                <CompanyDataForm company={company} locationOptions={locationOptions} />
            </div>
        </>
    );
}