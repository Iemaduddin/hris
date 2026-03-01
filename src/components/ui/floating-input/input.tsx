"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";

type FloatingInputType = InputHTMLAttributes<HTMLInputElement>["type"] | "currency";

export type CurrencyValue = {
	raw: string;
	numeric: number | null;
	formatted: string;
};

export type FloatingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	label: string;
	type?: FloatingInputType;
	helperText?: string;
	errorText?: string;
	containerClassName?: string;
	onCurrencyValueChange?: (value: CurrencyValue) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

function extractDigits(value: string) {
	return value.replace(/\D/g, "");
}

function formatRupiah(value: string) {
	const digits = extractDigits(value);
	if (!digits) return "";

	const numberValue = Number(digits);
	if (Number.isNaN(numberValue)) return "";

	return `Rp ${new Intl.NumberFormat("id-ID").format(numberValue)}`;
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(function FloatingInput(
	{
		id,
		label,
		type = "text",
		className,
		containerClassName,
		helperText,
		errorText,
		onChange,
		onCurrencyValueChange,
		value,
		defaultValue,
		placeholder,
		disabled,
		...props
	},
	ref,
) {
	const generatedId = useId();
	const resolvedId = id ?? generatedId;
	const isCurrency = type === "currency";
	const isControlled = value !== undefined;

	const [internalValue, setInternalValue] = useState(() => {
		if (defaultValue === undefined || defaultValue === null) return "";
		return String(defaultValue);
	});

	const sourceValue = isControlled ? String(value ?? "") : internalValue;
	const displayValue = isCurrency ? formatRupiah(sourceValue) : sourceValue;

	const inputType: InputHTMLAttributes<HTMLInputElement>["type"] = isCurrency ? "text" : type;

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!isCurrency) {
			if (!isControlled) {
				setInternalValue(event.currentTarget.value);
			}
			onChange?.(event);
			return;
		}

		const raw = extractDigits(event.currentTarget.value);
		const formatted = formatRupiah(raw);

		if (!isControlled) {
			setInternalValue(raw);
		}

		event.currentTarget.value = formatted;
		onChange?.(event);

		onCurrencyValueChange?.({
			raw,
			numeric: raw ? Number(raw) : null,
			formatted,
		});
	};

	return (
		<div className={cn("w-full", containerClassName)}>
			<div className="relative">
				<input
					ref={ref}
					id={resolvedId}
					type={inputType}
					value={displayValue}
					onChange={handleChange}
					placeholder={placeholder ?? " "}
					disabled={disabled}
					className={cn(
						"peer h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none transition",
						"border-blue-200 focus:border-blue-500",
						"dark:border-blue-900/70 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400",
						"placeholder:text-transparent",
						"disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
						"dark:disabled:bg-slate-800 dark:disabled:text-slate-400",
						errorText && "border-red-400 focus:border-red-500",
						errorText && "dark:border-red-500/70 dark:focus:border-red-400",
						className,
					)}
					{...props}
				/>
				<label
					htmlFor={resolvedId}
					className={cn(
						"pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all",
						"peer-focus:top-0 peer-focus:translate-y-[-50%] peer-focus:text-xs peer-focus:text-blue-600",
						"dark:bg-slate-900 dark:text-slate-400 dark:peer-focus:text-blue-400",
						"peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:translate-y-[-50%] peer-not-placeholder-shown:text-xs",
						errorText && "peer-focus:text-red-500",
						errorText && "dark:peer-focus:text-red-400",
					)}
				>
					{label}
				</label>
			</div>
			{errorText ? (
				<p className="mt-1 text-xs text-red-500">{errorText}</p>
			) : helperText ? (
				<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
			) : null}
		</div>
	);
});

export default FloatingInput;
