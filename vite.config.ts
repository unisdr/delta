import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import path from "path";

declare module "@remix-run/server-runtime" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [remix(
  {
      future: {
        v3_singleFetch: true,
      },
    }
  )],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),  // Define "~" as an alias for the "app" directory
    }
  }
});

