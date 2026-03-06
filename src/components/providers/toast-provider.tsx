"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ToastProvider() {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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
