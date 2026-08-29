import { defineConfig } from "tsdown"

export default defineConfig({
	clean: true,
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	sourcemap: true,
	dts: true,
	exports: true,
	publint: true,
	attw: {
		profile: "strict",
	},
})
