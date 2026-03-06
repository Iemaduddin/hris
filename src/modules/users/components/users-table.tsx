"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import DataTable, { type DataTableColumn } from "@/src/components/ui/data-table";
import ConfirmDialog from "@/src/components/ui/confirm-dialog";
import {
	bulkDeleteUsersAction,
	bulkUpdateUserRoleAction,
} from "../actions/user.actions";
import type { UserRoleOption, UserSummary } from "../types/user.type";
import UserActionsCell from "./user-actions-cell";

type UsersTableProps = {
	users: UserSummary[];
	roles: UserRoleOption[];
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	dateStyle: "medium",
	timeStyle: "short",
});

const roleLabel: Record<UserSummary["role"], string> = {
	EMPLOYEE: "Employee",
	HR_MANAGER: "HR Manager",
	MANAGER: "Manager",
	ADMIN: "Admin",
	SUPER_ADMIN: "Super Admin",
};

function getColumns(roles: UserRoleOption[]): DataTableColumn<UserSummary>[] {
	return [
	{
		id: "name",
		header: "Nama",
		accessor: "name",
		sortable: true,
		searchable: true,
	},
	{
		id: "email",
		header: "Email",
		accessor: "email",
		sortable: true,
		searchable: true,
	},
	{
		id: "role",
		header: "Role",
		render: (row) => roleLabel[row.role],
		sortable: true,
		sortValue: (row) => row.role,
		searchValue: (row) => roleLabel[row.role],
	},
	{
		id: "emailVerified",
		header: "Status Email",
		render: (row) => (row.emailVerified ? "Terverifikasi" : "Belum Verifikasi"),
		sortable: true,
		sortValue: (row) => (row.emailVerified ? 1 : 0),
	},
	{
		id: "createdAt",
		header: "Dibuat",
		render: (row) => dateFormatter.format(new Date(row.createdAt)),
		sortable: true,
		sortValue: (row) => new Date(row.createdAt),
		responsiveHidden: true,
	},
 	{
		id: "actions",
		header: "Aksi",
		render: (row) => <UserActionsCell user={row} />,
	},
	];
}

export default function UsersTable({ users, roles }: UsersTableProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [bulkRole, setBulkRole] = useState<UserSummary["role"]>(roles[0]?.value ?? "EMPLOYEE");
	const [selectionResetKey, setSelectionResetKey] = useState(0);
	const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

	const handleBulkUpdateRole = () => {
		if (selectedIds.length === 0) {
			toast.error("Pilih minimal satu user.");
			return;
		}

		startTransition(async () => {
			const result = await bulkUpdateUserRoleAction(selectedIds, bulkRole);
			if (!result.success) {
				toast.error(result.message || "Gagal memperbarui role user.");
				return;
			}

			toast.success(result.message || "Role user berhasil diperbarui.");
			setSelectionResetKey((prev) => prev + 1);
			router.refresh();
		});
	};

	const openBulkDeleteDialog = () => {
		if (selectedIds.length === 0) {
			toast.error("Pilih minimal satu user.");
			return;
		}

		setIsBulkDeleteDialogOpen(true);
	};

	const handleBulkDelete = () => {
		if (selectedIds.length === 0) {
			toast.error("Pilih minimal satu user.");
			return;
		}

		setIsBulkDeleteDialogOpen(false);

		startTransition(async () => {
			const result = await bulkDeleteUsersAction(selectedIds);
			if (!result.success) {
				toast.error(result.message || "Gagal menghapus user.");
				return;
			}

			toast.success(result.message || "User berhasil dihapus.");
			setSelectionResetKey((prev) => prev + 1);
			router.refresh();
		});
	};

	return (
		<div className="space-y-3">
            {selectedIds.length > 0 && (

			<div className="grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/60 dark:bg-blue-900/20 md:grid-cols-[1fr_auto_auto] md:items-center">
				<p className="text-sm text-slate-600 dark:text-slate-300">
					Aksi massal untuk user terpilih: <span className="font-semibold">{selectedIds.length}</span>
				</p>
				<select
					value={bulkRole}
					onChange={(event) => setBulkRole(event.target.value as UserSummary["role"])}
					disabled={isPending}
					className="h-10 rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-100"
				>
					{roles.map((role) => (
						<option key={role.value} value={role.value}>
							{role.label}
						</option>
					))}
				</select>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleBulkUpdateRole}
						disabled={isPending || selectedIds.length === 0}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
					>
						Update Role
					</button>
					<button
						type="button"
						onClick={openBulkDeleteDialog}
						disabled={isPending || selectedIds.length === 0}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
					>
						Hapus Terpilih
					</button>
				</div>
			</div>
            )}

			<DataTable
				data={users}
				columns={getColumns(roles)}
				getRowId={(row) => row.id}
                sortable
                searchable
				emptyMessage="Belum ada data user."
				searchPlaceholder="Cari user berdasarkan nama/email/role..."
				initialPageSize={10}
				initialSortState={{ columnId: "createdAt", direction: "desc" }}
				onSelectionChange={setSelectedIds}
				selectionResetKey={selectionResetKey}
			/>

			<ConfirmDialog
				open={isBulkDeleteDialogOpen}
				title="Konfirmasi Hapus User Terpilih"
				description={`${selectedIds.length} user terpilih akan dihapus permanen. Lanjutkan?`}
				confirmText="Ya, Hapus Semua"
				cancelText="Batal"
				isLoading={isPending}
				onCancel={() => setIsBulkDeleteDialogOpen(false)}
				onConfirm={handleBulkDelete}
			/>
		</div>
	);
}
