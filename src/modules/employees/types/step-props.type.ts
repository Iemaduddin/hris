import type {
 EmployeePersonalPayload,
 EmployeePositionPayload,
 EmployeeFamilyPayload,
 EmployeeEducationPayload,
 EmployeeWorkHistoryPayload,
 EmployeeContractPayload,
 EmployeeDocumentPayload,
 EmployeeWizardReferenceOptions,
} from "../types/employee.type";

export type StepProps<T> = {
 value: T;
 onChange: (updater: (prev: T) => T) => void;
 errorMap: Record<string, string>;
 referenceOptions: EmployeeWizardReferenceOptions;
};

export type PersonalStepProps = StepProps<EmployeePersonalPayload>;
export type PositionStepProps = StepProps<EmployeePositionPayload[]> & {
 isPending: boolean;
};
export type FamilyStepProps = StepProps<EmployeeFamilyPayload[]>;
export type EducationStepProps = StepProps<EmployeeEducationPayload[]> & {
	employeeName: string;
	onFileReady?: (index: number, field: "ijazah" | "transkrip", file: File) => void;
	onFileDelete?: (index: number, field: "ijazah" | "transkrip") => void;
};
export type WorkHistoryStepProps = StepProps<EmployeeWorkHistoryPayload[]>;
export type ContractStepProps = StepProps<EmployeeContractPayload[]>;
export type DocumentStepProps = StepProps<EmployeeDocumentPayload[]>;
