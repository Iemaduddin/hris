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
	| "link";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
type ButtonRounded = "none" | "sm" | "md" | "lg" | "full";
type LoadingPosition = "left" | "right";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	rounded?: ButtonRounded;
	fullWidth?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
	loading?: boolean;
	loadingText?: string;
	loadingPosition?: LoadingPosition;
};

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		"bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 dark:focus-visible:ring-blue-300",
	secondary:
		"bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-500 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:focus-visible:ring-slate-300",
	outline:
		"border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-400 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100 dark:hover:bg-blue-800/60 dark:focus-visible:ring-blue-300",
	ghost:
		"bg-transparent text-slate-700 hover:bg-blue-50 focus-visible:ring-blue-400 dark:text-slate-200 dark:hover:bg-blue-900/30 dark:focus-visible:ring-blue-300",
	danger:
		"bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400 dark:focus-visible:ring-red-300",
	success:
		"bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400 dark:focus-visible:ring-emerald-300",
	warning:
		"bg-amber-500 text-slate-950 hover:bg-amber-600 focus-visible:ring-amber-500 dark:bg-amber-400 dark:text-white dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300",
	info:
		"bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-500 dark:bg-cyan-500 dark:text-white dark:hover:bg-cyan-400 dark:focus-visible:ring-cyan-300",
	soft:
		"border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-300",
	link: "bg-transparent text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-400 dark:text-blue-300 dark:focus-visible:ring-blue-300",
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
				variantClasses[variant],
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
export type { ButtonVariant, ButtonSize, ButtonRounded, LoadingPosition };
