import config from "@antfu/eslint-config"
import * as graphqlPlugin from "@graphql-eslint/eslint-plugin"

export default config(
  {
    formatters: {
      graphql: true,
    },
    stylistic: {
      quotes: "double",
    },
    rules: {
      // Always use { } after if/for.
      "curly": ["error", "all"],
      "import/order": [
        "error",
        {
          // At least one new line between each group will be enforced, and new lines inside a group will be forbidden.
          "newlines-between": "always",
          "alphabetize": {
            order: "asc",
            orderImportKind: "asc",
          },
        },
      ],
      "no-console": "warn",
      // Don't replace "a" + b to `a${b}`
      "prefer-template": "off",
      "test/consistent-test-it": "off",
      // Allow types similar to interfaces
      "ts/consistent-type-definitions": "off",
      // Allow shorthand method type signature
      "ts/method-signature-style": "off",
      // One true brace style.
      "style/brace-style": ["error", "1tbs"],
      "unicorn/template-indent": [
        "error",
      ],
    },
  },
  {
    files: ["**/*.md/*.ts", "**/readme.sample.ts"],
    rules: {
      "no-console": "off",
    },
  },
).prepend(
  {
    files: ["**/*.ts"],
    processor: graphqlPlugin.processors.graphql,
  },
)
