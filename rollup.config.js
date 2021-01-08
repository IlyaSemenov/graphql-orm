import cleaner from "rollup-plugin-cleaner"
import typescript from "rollup-plugin-typescript2"

export default {
	input: "src/index.ts",
	output: {
		file: "dist/index.js",
		format: "cjs",
		sourcemap: true,
		exports: "auto",
	},
	plugins: [
		cleaner({ targets: ["./dist/"] }),
		typescript({
			tsconfigOverride: { exclude: ["**/*.test.ts", "src/tests"] },
		}),
	],
	external: ["graphql-parse-resolve-info", "objection"],
}
