import cleaner from "rollup-plugin-cleaner"
import copy from "rollup-plugin-copy"
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
			tsconfigOverride: { exclude: ["**/*.test.ts"] },
		}),
		copy({
			// I didn't manage to setup rollup-plugin-typescript2 to work with .d.ts
			targets: [{ src: "src/types.d.ts", dest: "dist" }],
		}),
	],
	external: ["graphql-parse-resolve-info", "objection"],
}
