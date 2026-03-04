import type { OrgUnitType } from "@/generated/prisma/enums";

export type OrganizationalUnitFormValues = {
	id?: string;
	parentId: string | null;
	name: string;
	code: string | null;
	type: OrgUnitType;
	description: string | null;
	order: number;
	isActive: boolean;
};

export type OrganizationalUnitValidationErrors = Partial<Record<keyof OrganizationalUnitFormValues, string>>;

export type OrganizationalUnitValidationResult =
	| {
		isValid: true;
		data: OrganizationalUnitFormValues;
	}
	| {
		isValid: false;
		errors: OrganizationalUnitValidationErrors;
	};

export type OrganizationalUnitActionResult = {
	success: boolean;
	message: string;
	id?: string;
	errors?: OrganizationalUnitValidationErrors;
};

export type OrganizationalUnitOption = {
	id: string;
	parentId: string | null;
	name: string;
	code: string | null;
	type: OrgUnitType;
	description: string | null;
	level: number;
	path: string | null;
	order: number;
	isActive: boolean;
};