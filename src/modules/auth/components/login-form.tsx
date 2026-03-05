"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Button from "@/src/components/ui/button";
import FloatingInput from "@/src/components/ui/floating-input/input";
import { authClient } from "@/src/lib/auth-client";

export default function LoginForm() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		startTransition(async () => {
			try {
				const response = await authClient.signIn.email({
					email,
					password,
					rememberMe: true,
				});

				if (response.error) {
					toast.error(response.error.message || "Email atau password tidak valid.");
					return;
				}

				toast.success("Login berhasil.");
				router.push("/");
				router.refresh();
			} catch (error) {
				const message = error instanceof Error ? error.message : "Gagal melakukan login.";
				toast.error(message);
			}
		});
	};

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl border border-blue-100 bg-white p-7 shadow-sm dark:border-blue-900/60 dark:bg-slate-900">
			<div>
				<h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Login</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masuk ke akun Anda untuk melanjutkan.</p>
			</div>
			<FloatingInput
				name="email"
				type="email"
				label="Email"
				autoComplete="email"
				value={email}
				onChange={(event) => setEmail(event.currentTarget.value)}
				required
			/>
			<FloatingInput
				name="password"
				type="password"
				label="Password"
				autoComplete="current-password"
				value={password}
				onChange={(event) => setPassword(event.currentTarget.value)}
				required
			/>
			<Button type="submit" variant="primary" fullWidth disabled={isPending}>
				{isPending ? "Memproses..." : "Masuk"}
			</Button>
		</form>
	);
}
