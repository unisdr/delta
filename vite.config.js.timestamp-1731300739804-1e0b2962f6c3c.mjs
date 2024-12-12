// vite.config.js
import { vitePlugin as remix } from "file:///var/www/html/dts/node_modules/@remix-run/dev/dist/index.js";
import { defineConfig } from "file:///var/www/html/dts/node_modules/vite/dist/node/index.js";
import path from "path";
var __vite_injected_original_dirname = "/var/www/html/dts";
var vite_config_default = defineConfig({
  plugins: [remix()],
  resolve: {
    alias: {
      "~": path.resolve(__vite_injected_original_dirname, "app")
      // Define "~" as an alias for the "app" directory
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvdmFyL3d3dy9odG1sL2R0c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Zhci93d3cvaHRtbC9kdHMvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Zhci93d3cvaHRtbC9kdHMvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyB2aXRlUGx1Z2luIGFzIHJlbWl4IH0gZnJvbSBcIkByZW1peC1ydW4vZGV2XCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlbWl4KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICd+JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2FwcCcpLCAgLy8gRGVmaW5lIFwiflwiIGFzIGFuIGFsaWFzIGZvciB0aGUgXCJhcHBcIiBkaXJlY3RvcnlcbiAgICB9XG4gIH1cbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFPLFNBQVMsY0FBYyxhQUFhO0FBQ3pRLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBO0FBQUEsSUFDcEM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
