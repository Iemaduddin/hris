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
		<form onSubmit={handleSubmit} className="mt-6 w-full space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
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
			<p className="text-xs text-slate-500 dark:text-slate-400">Pastikan email dan password sesuai dengan akun yang telah dibuat.</p>
			<Button type="submit" variant="primary" fullWidth disabled={isPending}>
				{isPending ? "Memproses..." : "Masuk"}
			</Button>
		</form>
	);
}
