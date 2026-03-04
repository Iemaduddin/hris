export type WorkLocationFormValues = {
	id?: string;
	name: string;
	code: string | null;
	address: string | null;
	city: string | null;
	province: string | null;
	postalCode: string | null;
	latitude: number | null;
	longitude: number | null;
	radiusMeters: number;
	isActive: boolean;
};

export type WorkLocationValidationErrors = Partial<Record<keyof WorkLocationFormValues, string>>;

export type WorkLocationValidationResult =
	| {
		isValid: true;
		data: WorkLocationFormValues;
	}
	| {
		isValid: false;
		errors: WorkLocationValidationErrors;
	};

export type WorkLocationActionResult = {
	success: boolean;
	message: string;
	id?: string;
	errors?: WorkLocationValidationErrors;
};

export type WorkLocationOption = {
	id: string;
	name: string;
	code: string | null;
	address: string | null;
	city: string | null;
	province: string | null;
	postalCode: string | null;
	latitude: number | null;
	longitude: number | null;
	radiusMeters: number | null;
	isActive: boolean;
};