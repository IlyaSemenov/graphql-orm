import tsconfig_paths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfig_paths()],
  resolve: {
    alias: {
      // See: https://github.com/graphql/graphql-js/issues/2801#issuecomment-1846206543
      graphql: "graphql/index.js",
    },
  },
})
