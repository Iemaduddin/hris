import { requireUserRole } from "@/src/lib/auth-guard";
import { getAuditLogList } from "@/src/modules/audit/actions/audit.actions";
import AuditClient from "@/src/modules/audit/components/audit-client";

export default async function AuditPage({
	searchParams,
}: {
	searchParams: Promise<{ aksi?: string; entity?: string; q?: string }>;
}) {
	await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "FINANCE"]);
	const params = await searchParams;
	const rows = await getAuditLogList({
		aksi: params.aksi,
		entityType: params.entity,
		q: params.q,
	});
	return <AuditClient initial={rows} />;
}
