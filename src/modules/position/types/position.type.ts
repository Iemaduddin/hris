export type PositionFormValues = {
	id?: string;
	unitOrganisasiId: string | null;
	golonganPosisiId: string | null;
	nama: string;
	kode: string | null;
	deskripsi: string | null;
};

export type PositionValidationErrors = Partial<Record<keyof PositionFormValues, string>>;

export type PositionValidationResult =
	| {
		isValid: true;
		data: PositionFormValues;
	}
	| {
		isValid: false;
		errors: PositionValidationErrors;
	};

export type PositionActionResult = {
	success: boolean;
	message: string;
	id?: string;
	errors?: PositionValidationErrors;
};

export type PositionOption = {
	id: string;
	unitOrganisasiId: string | null;
	orgUnitName: string | null;
	golonganPosisiId: string | null;
	golonganPosisiNama: string | null;
	nama: string;
	kode: string | null;
	deskripsi: string | null;
};

export type PositionSelectOption = {
	id: string;
	nama: string;
	kode: string | null;
};

export type PositionFormOptions = {
	organizationalUnits: PositionSelectOption[];
	jobGrades: PositionSelectOption[];
};
