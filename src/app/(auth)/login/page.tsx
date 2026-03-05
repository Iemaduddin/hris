import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/src/lib/auth-guard";
import LoginForm from "@/src/modules/auth/components/login-form";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";

export const metadata: Metadata = {
	title: "Login",
};

export default async function LoginPage() {
	const session = await getCurrentSession();
	if (session) {
		redirect("/");
	}

	const company = await getCompanyData();
	const companyName = company?.name?.trim() || "HRIS";
	const companyLogo = company?.logo || null;

	return (
		<div className="grid min-h-screen grid-cols-1 md:grid-cols-2 bg-white dark:bg-slate-900">
			<div className="hidden md:flex flex-col items-center justify-center gap-5 bg-blue-800 p-12 text-center dark:bg-blue-700">
				<div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-3">
					{companyLogo ? (
						<Image
							src={companyLogo}
							alt={`${companyName} logo`}
							width={160}
							height={160}
							className="h-full w-full object-contain"
							priority
						/>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-12 w-12 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-5.812A9.025 9.025 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9a9.025 9.025 0 01-1.757 5.759M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					)}
				</div>
				<h1 className="text-2xl font-bold text-white">{companyName}</h1>
				<p className="max-w-md text-sm text-blue-100">
					Human Resource Information System
				</p>
			</div>

			<div className="flex items-center justify-center p-8 md:p-12">
				<LoginForm />
			</div>
		</div>
	);
}
