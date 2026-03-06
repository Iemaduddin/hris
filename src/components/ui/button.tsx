import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "ghost"
	| "danger"
	| "success"
	| "warning"
	| "info"
	| "soft"
	| "light"
	| "link";
type ButtonStyleMode = "solid" | "outline" | "gloss";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
type ButtonRounded = "none" | "sm" | "md" | "lg" | "full";
type LoadingPosition = "left" | "right";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	styleMode?: ButtonStyleMode;
	size?: ButtonSize;
	rounded?: ButtonRounded;
	fullWidth?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
	loading?: boolean;
	loadingText?: string;
	loadingPosition?: LoadingPosition;
};

const solidVariantClasses: Record<ButtonVariant, string> = {
	primary:
		"bg-blue-600 !text-white hover:bg-blue-700 focus-visible:ring-blue-500 dark:bg-blue-500 dark:!text-white dark:hover:bg-blue-400 dark:focus-visible:ring-blue-300",
	secondary:
		"bg-slate-800 !text-white hover:bg-slate-900 focus-visible:ring-slate-500 dark:bg-slate-200 dark:!text-slate-900 dark:hover:bg-slate-300 dark:focus-visible:ring-slate-300",
	outline:
		"border border-slate-300 bg-white !text-slate-700 hover:bg-slate-50 focus-visible:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:!text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-300",
	ghost:
		"bg-transparent !text-slate-600 hover:bg-slate-100 focus-visible:ring-blue-400 dark:!text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-300",
	danger:
		"bg-rose-600 !text-white hover:bg-rose-700 focus-visible:ring-rose-500 dark:bg-rose-500 dark:!text-white dark:hover:bg-rose-400 dark:focus-visible:ring-rose-300",
	success:
		"bg-emerald-600 !text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:!text-white dark:hover:bg-emerald-400 dark:focus-visible:ring-emerald-300",
	warning:
		"bg-amber-500 !text-amber-950 hover:bg-amber-600 focus-visible:ring-amber-500 dark:bg-amber-400 dark:!text-amber-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300",
	info:
		"bg-sky-600 !text-white hover:bg-sky-700 focus-visible:ring-sky-500 dark:bg-sky-500 dark:!text-white dark:hover:bg-sky-400 dark:focus-visible:ring-sky-300",
	soft:
		"border border-blue-100 bg-blue-50 !text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-400 dark:border-blue-900/60 dark:bg-blue-900/30 dark:!text-blue-100 dark:hover:bg-blue-900/50 dark:focus-visible:ring-blue-300",
	light:
		"border border-slate-200 bg-slate-50 !text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:!text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-300",
	link: "bg-transparent !text-slate-600 underline-offset-4 hover:underline focus-visible:ring-blue-400 dark:!text-slate-200 dark:focus-visible:ring-blue-300",
};

const outlineVariantClasses: Record<ButtonVariant, string> = {
	primary:
		"border border-blue-500 bg-blue-50 !text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-500 dark:border-blue-400 dark:bg-blue-950/30 dark:!text-blue-100 dark:hover:bg-blue-900/40 dark:focus-visible:ring-blue-300",
	secondary:
		"border border-slate-400 bg-slate-50 !text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500 dark:border-slate-500 dark:bg-slate-800/40 dark:!text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300",
	outline:
		"border border-slate-400 bg-slate-50 !text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:!text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-300",
	ghost:
		"border border-slate-300 bg-transparent !text-slate-700 hover:bg-slate-100 focus-visible:ring-blue-400 dark:border-slate-700 dark:!text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-300",
	danger:
		"border border-rose-500 bg-rose-50 !text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-500 dark:border-rose-400 dark:bg-rose-950/30 dark:!text-rose-100 dark:hover:bg-rose-900/40 dark:focus-visible:ring-rose-300",
	success:
		"border border-emerald-500 bg-emerald-50 !text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950/30 dark:!text-emerald-100 dark:hover:bg-emerald-900/40 dark:focus-visible:ring-emerald-300",
	warning:
		"border border-amber-500 bg-amber-50 !text-amber-800 hover:bg-amber-100 focus-visible:ring-amber-500 dark:border-amber-400 dark:bg-amber-950/30 dark:!text-amber-100 dark:hover:bg-amber-900/40 dark:focus-visible:ring-amber-300",
	info:
		"border border-sky-500 bg-sky-50 !text-sky-700 hover:bg-sky-100 focus-visible:ring-sky-500 dark:border-sky-400 dark:bg-sky-950/30 dark:!text-sky-100 dark:hover:bg-sky-900/40 dark:focus-visible:ring-sky-300",
	soft:
		"border border-blue-300 bg-blue-50 !text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-400 dark:border-blue-700 dark:bg-blue-900/30 dark:!text-blue-100 dark:hover:bg-blue-900/50 dark:focus-visible:ring-blue-300",
	light:
		"border border-slate-300 bg-slate-50 !text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:!text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-300",
	link: "border border-transparent bg-transparent !text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-400 dark:!text-blue-300 dark:focus-visible:ring-blue-300",
};

const glossVariantClasses: Record<ButtonVariant, string> = {
	primary:
		"relative overflow-hidden border border-blue-500 bg-gradient-to-b from-blue-400 to-blue-600 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-blue-300 hover:to-blue-500 focus-visible:ring-blue-500 dark:border-blue-400 dark:from-blue-400 dark:to-blue-500 dark:!text-white",
	secondary:
		"relative overflow-hidden border border-slate-500 bg-gradient-to-b from-slate-600 to-slate-800 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-slate-500 hover:to-slate-700 focus-visible:ring-slate-500 dark:border-slate-400 dark:from-slate-300 dark:to-slate-500 dark:!text-slate-950",
	outline:
		"relative overflow-hidden border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-200 !text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-slate-50 hover:to-slate-100 focus-visible:ring-slate-500 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:!text-slate-100",
	ghost:
		"relative overflow-hidden border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 !text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-slate-50 hover:to-slate-100 focus-visible:ring-blue-400 dark:border-slate-700 dark:from-slate-700 dark:to-slate-800 dark:!text-slate-100",
	danger:
		"relative overflow-hidden border border-rose-500 bg-gradient-to-b from-rose-400 to-rose-600 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-rose-300 hover:to-rose-500 focus-visible:ring-rose-500 dark:border-rose-400 dark:from-rose-400 dark:to-rose-500 dark:!text-white",
	success:
		"relative overflow-hidden border border-emerald-500 bg-gradient-to-b from-emerald-400 to-emerald-600 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-emerald-300 hover:to-emerald-500 focus-visible:ring-emerald-500 dark:border-emerald-400 dark:from-emerald-400 dark:to-emerald-500 dark:!text-white",
	warning:
		"relative overflow-hidden border border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 !text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:from-amber-200 hover:to-amber-400 focus-visible:ring-amber-500 dark:border-amber-400 dark:from-amber-300 dark:to-amber-500 dark:!text-amber-950",
	info:
		"relative overflow-hidden border border-sky-500 bg-gradient-to-b from-sky-400 to-sky-600 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-sky-300 hover:to-sky-500 focus-visible:ring-sky-500 dark:border-sky-400 dark:from-sky-400 dark:to-sky-500 dark:!text-white",
	soft:
		"relative overflow-hidden border border-blue-300 bg-gradient-to-b from-blue-100 to-blue-200 !text-blue-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-blue-50 hover:to-blue-100 focus-visible:ring-blue-400 dark:border-blue-700 dark:from-blue-900/70 dark:to-blue-900 dark:!text-blue-100",
	light:
		"relative overflow-hidden border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 !text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] hover:from-white hover:to-slate-100 focus-visible:ring-slate-400 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800 dark:!text-slate-100",
	link: "bg-transparent !text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-400 dark:!text-blue-300 dark:focus-visible:ring-blue-300",
};

const sizeClasses: Record<ButtonSize, string> = {
	xs: "h-8 px-3 text-xs",
	sm: "h-9 px-3.5 text-sm",
	md: "h-10 px-4 text-sm",
	lg: "h-11 px-5 text-base",
	xl: "h-12 px-6 text-base",
};

const roundedClasses: Record<ButtonRounded, string> = {
	none: "rounded-none",
	sm: "rounded",
	md: "rounded-md",
	lg: "rounded-lg",
	full: "rounded-full",
};

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

function Spinner({ className = "" }: { className?: string }) {
	return (
		<svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
			<path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
		</svg>
	);
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		className,
		children,
		variant = "primary",
		styleMode = "solid",
		size = "md",
		rounded = "md",
		fullWidth = false,
		leftIcon,
		rightIcon,
		loading = false,
		loadingText,
		loadingPosition = "left",
		disabled,
		type = "button",
		...props
	},
	ref,
) {
	const isDisabled = disabled || loading;
	const label = loading && loadingText ? loadingText : children;
	const variantClassByStyleMode =
		styleMode === "outline"
			? outlineVariantClasses[variant]
			: styleMode === "gloss"
				? glossVariantClasses[variant]
				: solidVariantClasses[variant];

	return (
		<button
			ref={ref}
			type={type}
			disabled={isDisabled}
			className={cn(
				"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
				"transition-colors duration-200",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
				"disabled:cursor-not-allowed disabled:opacity-60",
				variantClassByStyleMode,
				sizeClasses[size],
				roundedClasses[rounded],
				fullWidth && "w-full",
				className,
			)}
			{...props}
		>
			{loading && loadingPosition === "left" ? <Spinner /> : leftIcon}
			{label}
			{loading && loadingPosition === "right" ? <Spinner /> : rightIcon}
		</button>
	);
});

export default Button;
export type { ButtonVariant, ButtonStyleMode, ButtonSize, ButtonRounded, LoadingPosition };
