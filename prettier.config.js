/**
 * @type {import('prettier').Options}
 */
export default {
	semi: false,
	useTabs: true,
	overrides: [
		{
			files: ["package.json", "*.md"],
			options: {
				useTabs: false,
			},
		},
	],
}
