"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { deleteUserAction, updateUserRoleAction } from "../actions/user.actions";
import type { UserRoleOption, UserSummary } from "../types/user.type";

type UserManagementFormProps = {
	users: UserSummary[];
	roles: UserRoleOption[];
};

export default function UserManagementForm({ users, roles }: UserManagementFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [selectedUserId, setSelectedUserId] = useState("");
	const [selectedRole, setSelectedRole] = useState(roles[0]?.value ?? "EMPLOYEE");

	const usersById = useMemo(() => {
		return new Map(users.map((user) => [user.id, user]));
	}, [users]);

	const userSelectOptions = useMemo(() => {
		return users.map((user) => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
		}));
	}, [users]);

	const roleSelectOptions = useMemo(() => {
		return roles.map((role) => ({
			value: role.value,
			label: role.label,
		}));
	}, [roles]);

	const handleUserChange = (userId: string) => {
		setSelectedUserId(userId);
		const user = usersById.get(userId);
		if (user) {
			setSelectedRole(user.role);
		}
	};

	const handleUpdateRole = () => {
		startTransition(async () => {
			const formData = new FormData();
			formData.set("userId", selectedUserId);
			formData.set("role", selectedRole);

			const result = await updateUserRoleAction(formData);
			if (!result.success) {
				toast.error(result.message || "Gagal memperbarui role user.");
				return;
			}

			toast.success(result.message || "Role user berhasil diperbarui.");
			router.refresh();
		});
	};

	const handleDeleteUser = () => {
		startTransition(async () => {
			const selectedUser = usersById.get(selectedUserId);
			if (selectedUser?.role === "SUPER_ADMIN") {
				toast.error("User dengan role Super Admin tidak boleh dihapus.");
				return;
			}

			const formData = new FormData();
			formData.set("userId", selectedUserId);

			const result = await deleteUserAction(formData);
			if (!result.success) {
				toast.error(result.message || "Gagal menghapus user.");
				return;
			}

			toast.success(result.message || "User berhasil dihapus.");
			router.refresh();
		});
	};

	return (
		<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
			<FloatingSelect
				name="managedUserId"
				label="Pilih User"
				value={selectedUserId}
				onValueChange={handleUserChange}
				options={userSelectOptions}
				searchable
			/>

			<FloatingSelect
				name="managedRole"
				label="Role Baru"
				value={selectedRole}
				onValueChange={(nextValue) => setSelectedRole(nextValue as UserSummary["role"])}
				options={roleSelectOptions}
				searchable={false}
				disabled={!selectedUserId}
			/>

			<div className="flex items-end gap-2">
				<button
					type="button"
					onClick={handleUpdateRole}
					disabled={isPending || !selectedUserId}
					className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isPending ? "Memproses..." : "Update Role"}
				</button>
				<button
					type="button"
					onClick={handleDeleteUser}
					disabled={isPending || !selectedUserId}
					className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isPending ? "Memproses..." : "Hapus User"}
				</button>
			</div>
		</div>
	);
}
