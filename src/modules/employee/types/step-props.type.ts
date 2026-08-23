import type {
 EmployeePersonalPayload,
 EmployeePositionPayload,
 EmployeeFamilyPayload,
 EmployeeEducationPayload,
 EmployeeWorkHistoryPayload,
 EmployeeKontrakPayload,
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
export type EducationStepProps = StepProps<EmployeeEducationPayload[]>;
export type WorkHistoryStepProps = StepProps<EmployeeWorkHistoryPayload[]>;
export type KontrakStepProps = StepProps<EmployeeKontrakPayload[]>;
export type DocumentStepProps = StepProps<EmployeeDocumentPayload[]>;
