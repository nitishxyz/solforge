import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [TanStackRouterVite(), react()],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:42069",
				changeOrigin: true,
			},
		},
	},
});
