export type ShiftFormValues = {
	kode: string;
	nama: string;
	jamMasuk: string;
	jamKeluar: string;
	lintasHari: boolean;
	toleransiTelatMenit: number;
	isActive: boolean;
};

export type ShiftValidationErrors = Partial<Record<keyof ShiftFormValues | "id", string>>;

export type ShiftValidationResult =
	| { isValid: true; data: ShiftFormValues & { id?: string } }
	| { isValid: false; errors: ShiftValidationErrors };

export type ShiftActionResult = {
	success: boolean;
	message: string;
	errors?: ShiftValidationErrors;
	id?: string;
};

export type ShiftListItem = {
	id: string;
	kode: string;
	nama: string;
	jamMasuk: string;
	jamKeluar: string;
	lintasHari: boolean;
	toleransiTelatMenit: number;
	isActive: boolean;
};
