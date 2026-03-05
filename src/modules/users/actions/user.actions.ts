"use server";

import { UserRole } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/src/lib/auth";
import { canManageUsers } from "@/src/lib/auth-guard";
import prisma from "@/src/lib/prisma";
import { parseAndValidateUserData, parseAndValidateUserUpdateData } from "../schemas/user.schema";
import type { UserActionResult, UserRoleOption, UserSummary } from "../types/user.type";

const roleLabels: Record<UserRole, string> = {
	SUPER_ADMIN: "Super Admin",
	ADMIN: "Admin",
	HR_MANAGER: "HR Manager",
	MANAGER: "Manager",
	EMPLOYEE: "Employee",
};

export async function getUserRoleOptions(): Promise<UserRoleOption[]> {
	return Object.values(UserRole).map((role) => ({
		value: role,
		label: roleLabels[role],
	}));
}

export async function getUserSummaries(): Promise<UserSummary[]> {
	const users = await prisma.user.findMany({
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			emailVerified: true,
			createdAt: true,
		},
	});

	return users.map((user) => ({
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		emailVerified: user.emailVerified,
		createdAt: user.createdAt.toISOString(),
	}));
}

export async function createUserAction(formData: FormData): Promise<UserActionResult> {
	if (!(await canManageUsers())) {
		return {
			success: false,
			message: "Anda tidak memiliki izin untuk membuat user.",
		};
	}

	const validation = parseAndValidateUserData(formData);

	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { data } = validation;
	const existing = await prisma.user.findUnique({
		where: { email: data.email },
		select: { id: true },
	});

	if (existing) {
		return {
			success: false,
			message: "Email sudah terdaftar.",
			errors: { email: "Gunakan email lain karena email ini sudah dipakai." },
		};
	}

	try {
		await auth.api.signUpEmail({
			body: {
				name: data.name,
				email: data.email,
				password: data.password,
			},
		});

		await prisma.user.update({
			where: { email: data.email },
			data: { role: data.role },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal membuat user.";
		return { success: false, message };
	}

	revalidatePath("/users");

	return {
		success: true,
		message: "User berhasil dibuat.",
	};
}

export async function submitUserAction(
	_prevState: UserActionResult | null,
	formData: FormData,
): Promise<UserActionResult> {
	const userId = String(formData.get("id") ?? "").trim();
	if (!userId) {
		return createUserAction(formData);
	}

	return updateUserAction(formData);
}

export async function updateUserAction(formData: FormData): Promise<UserActionResult> {
	if (!(await canManageUsers())) {
		return {
			success: false,
			message: "Anda tidak memiliki izin untuk memperbarui user.",
		};
	}

	const validation = parseAndValidateUserUpdateData(formData);
	if (!validation.isValid) {
		return {
			success: false,
			message: "Validasi gagal.",
			errors: validation.errors,
		};
	}

	const { id, name, email, role } = validation.data;

	const user = await prisma.user.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!user) {
		return {
			success: false,
			message: "User tidak ditemukan.",
		};
	}

	const emailOwner = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (emailOwner && emailOwner.id !== id) {
		return {
			success: false,
			message: "Email sudah terdaftar.",
			errors: { email: "Gunakan email lain karena email ini sudah dipakai." },
		};
	}

	try {
		await prisma.user.update({
			where: { id },
			data: {
				name,
				email,
				role,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal memperbarui user.";
		return { success: false, message };
	}

	revalidatePath("/users");

	return {
		success: true,
		message: "User berhasil diperbarui.",
	};
}

function getTrimmedFormValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

export async function updateUserRoleAction(formData: FormData): Promise<UserActionResult> {
	if (!(await canManageUsers())) {
		return {
			success: false,
			message: "Anda tidak memiliki izin untuk memperbarui role.",
		};
	}

	const userId = getTrimmedFormValue(formData, "userId");
	const role = getTrimmedFormValue(formData, "role");

	if (!userId) {
		return {
			success: false,
			message: "Pilih user terlebih dahulu.",
		};
	}

	if (!Object.values(UserRole).includes(role as UserRole)) {
		return {
			success: false,
			message: "Role tidak valid.",
		};
	}

	try {
		await prisma.user.update({
			where: { id: userId },
			data: { role: role as UserRole },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal memperbarui role user.";
		return { success: false, message };
	}

	revalidatePath("/users");

	return {
		success: true,
		message: "Role user berhasil diperbarui.",
	};
}

export async function deleteUserAction(formData: FormData): Promise<UserActionResult> {
	if (!(await canManageUsers())) {
		return {
			success: false,
			message: "Anda tidak memiliki izin untuk menghapus user.",
		};
	}

	const userId = getTrimmedFormValue(formData, "userId");

	if (!userId) {
		return {
			success: false,
			message: "Pilih user yang ingin dihapus.",
		};
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	if (!user) {
		return {
			success: false,
			message: "User tidak ditemukan.",
		};
	}

	if (user.role === UserRole.SUPER_ADMIN) {
		return {
			success: false,
			message: "User dengan role Super Admin tidak boleh dihapus.",
		};
	}

	try {
		await prisma.user.delete({
			where: { id: userId },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal menghapus user.";
		return { success: false, message };
	}

	revalidatePath("/users");

	return {
		success: true,
		message: "User berhasil dihapus.",
	};
}

export async function getUserById(userId: string){
const currentUser = await prisma.user.findUnique({
		where: { id: userId},
		select: {
			name: true,
			email: true,
		},
});
    return currentUser;
}

export async function bulkUpdateUserRoleAction(userIds: string[], role: UserRole): Promise<UserActionResult> {
	if (!(await canManageUsers())) {
		return {
			success: false,
			message: "Anda tidak memiliki izin untuk memperbarui role.",
		};
	}

	const normalizedIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
	if (normalizedIds.length === 0) {
		return {
			success: false,
			message: "Pilih minimal satu user.",
		};
	}

	if (!Object.values(UserRole).includes(role)) {
		return {
			success: false,
			message: "Role tidak valid.",
		};
	}

	try {
		const result = await prisma.user.updateMany({
			where: { id: { in: normalizedIds } },
			data: { role },
		});

		revalidatePath("/users");
		return {
			success: true,
			message: `Role berhasil diperbarui untuk ${result.count} user.`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal memperbarui role user.";
		return { success: false, message };
	}
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<UserActionResult> {
	if (!(await canManageUsers())) {
		return {
			success: false,
			message: "Anda tidak memiliki izin untuk menghapus user.",
		};
	}

	const normalizedIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
	if (normalizedIds.length === 0) {
		return {
			success: false,
			message: "Pilih minimal satu user.",
		};
	}

	const users = await prisma.user.findMany({
		where: { id: { in: normalizedIds } },
		select: { id: true, role: true },
	});

	if (users.some((user) => user.role === UserRole.SUPER_ADMIN)) {
		return {
			success: false,
			message: "Ada user Super Admin dalam pilihan. Super Admin tidak boleh dihapus.",
		};
	}

	try {
		const result = await prisma.user.deleteMany({
			where: { id: { in: users.map((user) => user.id) } },
		});

		revalidatePath("/users");
		return {
			success: true,
			message: `${result.count} user berhasil dihapus.`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Gagal menghapus user.";
		return { success: false, message };
	}
}