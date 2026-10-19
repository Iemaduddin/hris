import { notFound, redirect } from "next/navigation";
import { getCurrentSession, requireUserRole } from "@/src/lib/auth-guard";
import { getTransferDetail } from "@/src/modules/employees/actions/transfers.actions";
import TransferDetailClient from "@/src/modules/employees/components/transfer-detail-client";

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireUserRole(["SUPER_ADMIN", "ADMIN_HR", "MANAJER"]);
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getTransferDetail(id, session.user.id);
  if (!detail) notFound();
  const canApply = role === "SUPER_ADMIN" || role === "ADMIN_HR";

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 dark:border-blue-900/60 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {detail.kindLabel} {detail.number}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail.employeeName}</p>
      </div>

      <div className="mt-5">
        <TransferDetailClient userId={session.user.id} canApply={canApply} detail={detail} />
      </div>
    </>
  );
}
