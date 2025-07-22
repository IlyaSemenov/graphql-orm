import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [tsconfigPaths()],
	resolve: {
		alias: {
			// See: https://github.com/graphql/graphql-js/issues/2801#issuecomment-1846206543
			graphql: "graphql/index.js",
		},
	},
})
