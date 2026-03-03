export type CompanyFormValues = {
	id?: string;
	name: string;
	logo: string | null;
	taxId: string | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	address: string | null;
	provinceId: string | null;
	cityId: string | null;
	districtId: string | null;
	villageId: string | null;
	postalCode: string | null;
};

export type CompanyValidationErrors = Partial<Record<keyof CompanyFormValues | "currency" | "language" | "timezone", string>>;

export type CompanyValidationResult =
	| {
		isValid: true;
		data: CompanyFormValues;
	}
	| {
		isValid: false;
		errors: CompanyValidationErrors;
	};

export type CompanyActionResult = {
	success: boolean;
	message: string;
	errors?: CompanyValidationErrors;
};

export type CompanyPreviewData = {
	id: string;
	name: string;
	logo: string | null;
	taxId: string | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	address: string | null;
	provinceId: string | null;
	provinceName: string | null;
	cityId: string | null;
	cityName: string | null;
	districtId: string | null;
	districtName: string | null;
	villageId: string | null;
	villageName: string | null;
	postalCode: string | null;
};

export type LocationOption = {
	id: string;
	name: string;
};

export type CompanyLocationOptions = {
	provinces: LocationOption[];
	cities: Array<LocationOption & { provinceId: string }>;
	districts: Array<LocationOption & { cityId: string }>;
	villages: Array<LocationOption & { districtId: string }>;
};

export type CompanyLogoUploadResult = {
	success: boolean;
	message: string;
	logo?: string;
};
