import {vitePlugin as remix} from "@remix-run/dev";
import {defineConfig} from "vite";
import path from "path";
import {flatRoutes} from "remix-flat-routes";

declare module "@remix-run/server-runtime" {
	interface Future {
		v3_singleFetch: true;
	}
}

export default defineConfig({
	plugins: [
		remix({
			routes: async defineRoutes => {
				// Integrate flatRoutes to dynamically define Remix routes
				return flatRoutes("routes", defineRoutes);
			},
			future: {
				v3_singleFetch: true,
			},
		}),
	],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "app"), // Define "~" as an alias for the "app" directory
		},
	},
});


