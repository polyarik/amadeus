import loader from "rollup-plugin-typescript2";
import typescript from "ttypescript";
import { defineConfig } from "vite";

const transformer = { ...loader({ typescript }), enforce: "pre" };

export default defineConfig({
  plugins: [transformer],
  test: {
    exclude: ["node_modules", "build", ".svelte-kit"],
    coverage: {
      reporter: ["lcovonly", "text"],
    },
  },
});
