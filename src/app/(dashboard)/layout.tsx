import DashboardShell from "@/src/components/layout/dashboard-shell";
import { requireAuthenticatedUser } from "@/src/lib/auth-guard";
import { getCompanyData } from "@/src/modules/company-data/actions/company-data.actions";
import { getUserById } from "@/src/modules/users/actions/user.actions";

export default async function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await requireAuthenticatedUser();
	const company = await getCompanyData();
	const currentUser = await getUserById(session.user.id);

	const topbarUser = {
		name: currentUser?.name || session.user.name || "User",
		email: currentUser?.email || session.user.email || "-",
	};

	return (
		<DashboardShell
			company={company ? { name: company.name, logo: company.logo } : null}
			user={topbarUser}
		>
			{children}
		</DashboardShell>
	);
}
