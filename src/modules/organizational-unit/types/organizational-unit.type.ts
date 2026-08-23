export type OrganizationalUnitFormValues = {
	id?: string;
	parentId: string | null;
	nama: string;
	kode: string | null;
	deskripsi: string | null;
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
	nama: string;
	kode: string | null;
	deskripsi: string | null;
};
