const node = require("@rollup/plugin-node-resolve").default;
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { defineConfig } = require("vite");

const name = require(resolve("./package.json")).name;
const monorepo = existsSync(resolve("../../package.json"));

export default defineConfig({
  plugins: [{ ...node(), enforce: "pre" }],
  resolve: { alias: { "@amadeus-music/core": "../app.cjs" } },
  build: {
    emptyOutDir: monorepo ? false : true,
    outDir: monorepo ? "../../build/plugins" : "./build",
    lib: {
      formats: ["cjs"],
      entry: "./index.ts",
      fileName: (ext) =>
        `${name.replace(/(@(\w|-)*\/)|((\w|-)*-)/g, "")}.${ext}`,
    },
    rollupOptions: {
      external: ["../app.cjs"],
    },
  },
});