"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

export type FloatingTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label: string;
	helperText?: string;
	errorText?: string;
	containerClassName?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(function FloatingTextarea(
	{ id, label, className, containerClassName, helperText, errorText, placeholder, disabled, ...props },
	ref,
) {
	const generatedId = useId();
	const resolvedId = id ?? generatedId;

	return (
		<div className={cn("w-full", containerClassName)}>
			<div className="relative">
				<textarea
					ref={ref}
					id={resolvedId}
					placeholder={placeholder ?? " "}
					disabled={disabled}
					className={cn(
						"peer min-h-28 w-full rounded-lg border bg-white px-3 pt-6 pb-2 text-sm text-slate-800 outline-none transition",
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
						"pointer-events-none absolute left-3 top-4 bg-white px-1 text-sm text-slate-500 transition-all",
						"peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-600",
						"dark:bg-slate-900 dark:text-slate-400 dark:peer-focus:text-blue-400",
						"peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-xs",
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

export default FloatingTextarea;
