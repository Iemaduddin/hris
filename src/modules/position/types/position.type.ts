export type PositionFormValues = {
	id?: string;
	organizationalUnitId: string | null;
	jobGradeId: string | null;
	name: string;
	code: string | null;
	description: string | null;
	isActive: boolean;
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
	organizationalUnitId: string | null;
	organizationalUnitName: string | null;
	jobGradeId: string | null;
	jobGradeName: string | null;
	name: string;
	code: string | null;
	description: string | null;
	isActive: boolean;
};

export type PositionSelectOption = {
	id: string;
	name: string;
	code: string | null;
	level?: number;
};

export type PositionFormOptions = {
	organizationalUnits: PositionSelectOption[];
	jobGrades: PositionSelectOption[];
};