export type KalenderKerjaFormValues = {
	id?: number;
	nama: string;
	kode: string | null;
	deskripsi: string | null;
	isDefault: boolean;
	isActive: boolean;
};

export type KalenderKerjaValidationErrors = Partial<Record<keyof KalenderKerjaFormValues, string>>;

export type KalenderKerjaValidationResult =
	| { isValid: true; data: KalenderKerjaFormValues }
	| { isValid: false; errors: KalenderKerjaValidationErrors };

export type KalenderKerjaActionResult = {
	success: boolean;
	message: string;
	id?: number;
	errors?: KalenderKerjaValidationErrors;
};

export type JadwalKerjaFormValues = {
	id?: number;
	kalenderKerjaId: number;
	hari: string;
	isHariKerja: boolean;
	jamMasuk: string;
	jamKeluar: string;
	jamMulaiIstirahat: string | null;
	jamSelesaiIstirahat: string | null;
};

export type JadwalKerjaValidationErrors = Partial<Record<keyof JadwalKerjaFormValues, string>>;

export type JadwalKerjaValidationResult =
	| { isValid: true; data: JadwalKerjaFormValues }
	| { isValid: false; errors: JadwalKerjaValidationErrors };

export type JadwalKerjaActionResult = {
	success: boolean;
	message: string;
	id?: number;
	errors?: JadwalKerjaValidationErrors;
};

export type HariLiburFormValues = {
	id?: number;
	kalenderKerjaId: number;
	tanggal: string;
	nama: string;
	deskripsi: string | null;
	isCutiBersama: boolean;
};

export type HariLiburValidationErrors = Partial<Record<keyof HariLiburFormValues, string>>;

export type HariLiburValidationResult =
	| { isValid: true; data: HariLiburFormValues }
	| { isValid: false; errors: HariLiburValidationErrors };

export type HariLiburActionResult = {
	success: boolean;
	message: string;
	id?: number;
	errors?: HariLiburValidationErrors;
};

export type KalenderKerjaListItem = {
	id: number;
	nama: string;
	kode: string | null;
	deskripsi: string | null;
	isDefault: boolean;
	isActive: boolean;
	_count: {
		jadwalKerja: number;
		hariLibur: number;
	};
};

export type JadwalKerjaListItem = {
	id: number;
	hari: string;
	isHariKerja: boolean;
	jamMasuk: Date | null;
	jamKeluar: Date | null;
	jamMulaiIstirahat: Date | null;
	jamSelesaiIstirahat: Date | null;
};

export type HariLiburListItem = {
	id: number;
	tanggal: Date;
	nama: string;
	deskripsi: string | null;
	isCutiBersama: boolean;
};
