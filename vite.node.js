import { externals } from "rollup-plugin-node-externals";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [{ ...externals({ deps: false }), enforce: "pre" }],
  resolve: {
    conditions: ["import", "module", "node", "default"],
  },
  test: {
    exclude: ["node_modules", "build", ".svelte-kit"],
    coverage: {
      reporter: ["lcovonly", "text"],
    },
  },
});
