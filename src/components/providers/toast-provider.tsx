"use client";

import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useMounted } from "@/src/hooks/use-mounted";

export default function ToastProvider() {
	const { resolvedTheme } = useTheme();
	const mounted = useMounted();

	const toastTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";

	return (
		<ToastContainer
			position="top-right"
			autoClose={2500}
			hideProgressBar={false}
			newestOnTop
			closeOnClick
			pauseOnHover
			draggable
			theme={toastTheme}
		/>
	);
}
