import adapter from "@sveltejs/adapter-static";
import preprocess from "svelte-preprocess";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess({ postcss: true }),

  kit: {
    files: {
      routes: "routes",
      template: "routes/+layout.html",
    },

    prerender: { default: true },
    adapter: adapter({ pages: "../../build/public" }),
  },
};

export default config;
