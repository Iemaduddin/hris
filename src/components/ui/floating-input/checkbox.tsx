"use client";

import { useId, type InputHTMLAttributes } from "react";

export type FloatingCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	label: string;
	helperText?: string;
	errorText?: string;
	containerClassName?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

const FloatingCheckbox = function FloatingCheckbox({
	id,
	label,
	required,
	helperText,
	errorText,
	containerClassName,
	disabled,
	className,
	...props
}: FloatingCheckboxProps) {
	const generatedId = useId();
	const resolvedId = id ?? generatedId;

	return (
		<div className={cn("w-full", containerClassName)}>
			<label
				htmlFor={resolvedId}
				className={cn(
					"flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition",
					"border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/50",
					"dark:border-blue-900/70 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-blue-900/20",
					disabled && "cursor-not-allowed opacity-60 hover:border-blue-200 hover:bg-white dark:hover:border-blue-900/70 dark:hover:bg-slate-900",
					errorText && "border-red-400 dark:border-red-500/70",
					className,
				)}
			>
				<span className="relative mt-0.5 flex shrink-0 items-center">
					<input
						id={resolvedId}
						type="checkbox"
						disabled={disabled}
						className="peer sr-only"
						{...props}
					/>
					<span className="flex h-[18px] w-[18px] items-center justify-center rounded border-[2px] border-blue-300 bg-white transition-all peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500/30 dark:border-blue-700 dark:bg-slate-800 dark:peer-checked:border-blue-500 dark:peer-checked:bg-blue-500 dark:peer-focus:ring-blue-400/30" />
					<svg
						className="pointer-events-none absolute h-[18px] w-[18px] text-white opacity-0 transition-opacity peer-checked:opacity-100"
						viewBox="0 0 14 14"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
				<span className="text-sm leading-tight text-slate-700 dark:text-slate-200">
					{label}
					{required && <span className="ml-0.5 text-red-500">*</span>}
				</span>
			</label>

			{errorText ? (
				<p className="mt-1 text-xs text-red-500">{errorText}</p>
			) : helperText ? (
				<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
			) : null}
		</div>
	);
};

export default FloatingCheckbox;
