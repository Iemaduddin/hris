"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "react-toastify";
import FloatingInput from "@/src/components/ui/floating-input/input";
import FloatingSelect from "@/src/components/ui/floating-input/select";
import { submitUserAction } from "../actions/user.actions";
import type { UserActionResult, UserRoleOption, UserSummary } from "../types/user.type";

function SubmitButton() {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
		>
			{pending ? "Menyimpan..." : "Simpan"}
		</button>
	);
}

type UserDataFormProps = {
	roles: UserRoleOption[];
	users: UserSummary[];
};

export default function UserDataForm({ roles, users }: UserDataFormProps) {
	const [state, formAction] = useActionState<UserActionResult | null, FormData>(submitUserAction, null);
	const formRef = useRef<HTMLFormElement>(null);
	const handledStateRef = useRef<UserActionResult | null>(null);
	const [formVersion, setFormVersion] = useState(0);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const editUserId = searchParams.get("editUserId") || "";
	const editingUser = useMemo(
		() => users.find((user) => user.id === editUserId) ?? null,
		[editUserId, users],
	);
	const isEditMode = Boolean(editingUser);
	const formKey = `${editingUser?.id ?? "create"}-${formVersion}`;

	useEffect(() => {
		if (!state) return;
		if (handledStateRef.current === state) return;

		handledStateRef.current = state;

		if (!state.success) {
			toast.error(state.message || "Gagal menyimpan user.");
			return;
		}
        

		toast.success(state.message || (isEditMode ? "User berhasil diperbarui." : "User berhasil dibuat."));

		if (isEditMode) {
			router.replace(pathname);
		} else {
			setFormVersion((prev) => prev + 1);
		}

		router.refresh();
	}, [isEditMode, pathname, router, state]);

	useEffect(() => {
		if (!state || state.success || !state.errors) return;

		const orderedFields = isEditMode ? (["name", "email", "role"] as const) : (["name", "email", "password", "role"] as const);

		for (const field of orderedFields) {
			if (!state.errors[field]) continue;

			const namedField = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
			if (namedField && namedField.tabIndex !== -1 && namedField.getAttribute("aria-hidden") !== "true") {
				namedField.scrollIntoView({ behavior: "smooth", block: "center" });
				namedField.focus({ preventScroll: true });
				return;
			}

			const selectTrigger = formRef.current?.querySelector<HTMLElement>(`[data-select-trigger-for="${field}"]`);
			if (selectTrigger) {
				selectTrigger.scrollIntoView({ behavior: "smooth", block: "center" });
				selectTrigger.focus({ preventScroll: true });
				return;
			}
		}
	}, [isEditMode, state]);

	const handleCancelEdit = () => {
		router.replace(pathname);
	};

	return (
		<form key={formKey} ref={formRef} action={formAction} className="mt-4">
			<input type="hidden" name="id" defaultValue={editingUser?.id ?? ""} />
			<div className={`grid grid-cols-1 gap-4 ${isEditMode ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
				<FloatingInput
					name="name"
					label="Nama Lengkap"
					defaultValue={editingUser?.name ?? ""}
					errorText={state?.errors?.name}
					required
				/>
				<FloatingInput
					name="email"
					label="Email"
					type="email"
					defaultValue={editingUser?.email ?? ""}
					errorText={state?.errors?.email}
					required
				/>
				{!isEditMode && (
					<FloatingInput
						name="password"
						label="Password"
						type="password"
						errorText={state?.errors?.password}
						required
					/>
				)}
				<FloatingSelect
					name="role"
					label="Role"
					defaultValue={editingUser?.role ?? "EMPLOYEE"}
					options={roles.map((item) => ({ value: item.value, label: item.label }))}
					errorText={state?.errors?.role}
					searchable={false}
					required
				/>
			</div>
			<div className="mt-4 flex items-center justify-end gap-2">
				{isEditMode && (
					<button
						type="button"
						onClick={handleCancelEdit}
						className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100"
					>
						Batal Edit
					</button>
				)}
				<SubmitButton />
			</div>
		</form>
	);
}
