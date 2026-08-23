"use client";

import { useSyncExternalStore } from "react";

export function useMounted(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}

function subscribe() {
	return () => {};
}
