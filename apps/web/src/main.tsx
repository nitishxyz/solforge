import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// Configure AGI API client
import { client } from "@agi-cli/api";
client.setConfig({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3456",
});

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
	const root = createRoot(rootElement);
	root.render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
				<Toaster position="bottom-right" theme="dark" richColors />
			</QueryClientProvider>
		</StrictMode>,
	);
}
