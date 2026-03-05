import { UserRole } from "@/generated/prisma/client";
import { z } from "zod";
import type { UserValidationErrors, UserValidationResult } from "../types/user.type";

function toStringValue(formData: FormData, key: string) {
	return String(formData.get(key) ?? "").trim();
}

const userFormSchema = z.object({
	name: z.string().min(2, "Nama minimal 2 karakter."),
	email: z.email("Format email tidak valid."),
	password: z
		.string()
		.min(8, "Password minimal 8 karakter.")
		.max(128, "Password maksimal 128 karakter."),
	role: z.enum(UserRole),
});

const userUpdateFormSchema = z.object({
	id: z.string().min(1, "ID user tidak valid."),
	name: z.string().min(2, "Nama minimal 2 karakter."),
	email: z.email("Format email tidak valid."),
	role: z.enum(UserRole),
});

export function parseAndValidateUserData(formData: FormData): UserValidationResult {
	const parsed = userFormSchema.safeParse({
		name: toStringValue(formData, "name"),
		email: toStringValue(formData, "email").toLowerCase(),
		password: toStringValue(formData, "password"),
		role: toStringValue(formData, "role"),
	});

	if (!parsed.success) {
		const errors: UserValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof UserValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false,
			errors,
		};
	}

	return {
		isValid: true,
		data: parsed.data,
	};
}

export function parseAndValidateUserUpdateData(formData: FormData) {
	const parsed = userUpdateFormSchema.safeParse({
		id: toStringValue(formData, "id"),
		name: toStringValue(formData, "name"),
		email: toStringValue(formData, "email").toLowerCase(),
		role: toStringValue(formData, "role"),
	});

	if (!parsed.success) {
		const errors: UserValidationErrors = {};

		for (const issue of parsed.error.issues) {
			const path = issue.path.join(".");
			if (path && !(path in errors)) {
				errors[path as keyof UserValidationErrors] = issue.message;
			}
		}

		return {
			isValid: false as const,
			errors,
		};
	}

	return {
		isValid: true as const,
		data: parsed.data,
	};
}
