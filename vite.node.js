import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [{ ...nodeResolve(), enforce: "pre" }],
  test: {
    exclude: ["node_modules", "build", ".svelte-kit"],
    coverage: {
      reporter: ["lcovonly", "text"],
    },
  },
});