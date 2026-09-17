export type WorkLocationFormValues = {
	id?: string;
	nama: string;
	kode: string | null;
	alamat: string | null;
	kota: string | null;
	provinsi: string | null;
	kodePos: string | null;
	// Titik pusat & radius validasi presensi (PRD mobile Bag. 5.4 / B2).
	// null = lokasi tidak divalidasi radius.
	latitude: number | null;
	longitude: number | null;
	radiusMeter: number | null;
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
	nama: string;
	kode: string | null;
	alamat: string | null;
	kota: string | null;
	provinsi: string | null;
	kodePos: string | null;
	latitude: number | null;
	longitude: number | null;
	radiusMeter: number | null;
	isActive: boolean;
};
