// @ts-check

import { defineConfig } from "@ilyasemenov/eslint-config"

export default defineConfig({
	stylistic: {
		indent: "tab",
	},
	rules: {
		"antfu/no-top-level-await": "off",
	},
}).append({
	files: ["**/*.md/*"],
	rules: {
		"@stylistic/indent": ["error", 2],
		"jsonc/indent": ["error", 2],
	},
}).append({
	files: ["**/*.md/*.{js,ts}", "packages/*/playground/**/*.ts"],
	rules: {
		"no-console": "off",
	},
})
