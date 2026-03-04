export type JobGradeFormValues = {
	id?: string;
	name: string;
	code: string | null;
	level: number;
	minSalary: string | null;
	maxSalary: string | null;
	description: string | null;
};

export type JobGradeValidationErrors = Partial<Record<keyof JobGradeFormValues, string>>;

export type JobGradeValidationResult =
	| {
		isValid: true;
		data: JobGradeFormValues;
	}
	| {
		isValid: false;
		errors: JobGradeValidationErrors;
	};

export type JobGradeActionResult = {
	success: boolean;
	message: string;
	id?: string;
	errors?: JobGradeValidationErrors;
};

export type JobGradeOption = {
	id: string;
	name: string;
	code: string | null;
	level: number;
	minSalary: string | null;
	maxSalary: string | null;
	description: string | null;
};