import type { UserRole } from "@/generated/prisma/client";

export type UserFormValues = {
	name: string;
	email: string;
	password: string;
	role: UserRole;
};

export type UserValidationErrors = Partial<Record<keyof UserFormValues, string>>;

export type UserValidationResult =
	| {
		isValid: true;
		data: UserFormValues;
	}
	| {
		isValid: false;
		errors: UserValidationErrors;
	};

export type UserActionResult = {
	success: boolean;
	message: string;
	errors?: UserValidationErrors;
};

export type UserRoleOption = {
	value: UserRole;
	label: string;
};

export type UserSummary = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	emailVerified: boolean;
	createdAt: string;
};
