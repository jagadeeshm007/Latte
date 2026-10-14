import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX, { createNodeResolver } from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

// Flat config for the Node packages (apps/api, packages/*, evals). apps/web
// has its own. Strict type-checked TypeScript and import order; Prettier owns
// formatting. Tenet 1: only packages/gateway may name a model provider.
const PROVIDER_HOSTS = "api\\.groq\\.com|openrouter\\.ai|generativelanguage\\.googleapis\\.com|api\\.openai\\.com";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "apps/web/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver(), createNodeResolver()],
    },
    rules: {
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "no-console": ["error", { allow: ["error"] }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.ts"],
    ignores: ["packages/gateway/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: ["groq-sdk", "openai", "@google/genai"].map((name) => ({ name, message: "model calls go through @scc/gateway (tenet 1)" })) },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${PROVIDER_HOSTS}/]`,
          message: "model provider URLs live only in packages/gateway (tenet 1)",
        },
        {
          selector: `TemplateElement[value.raw=/${PROVIDER_HOSTS}/]`,
          message: "model provider URLs live only in packages/gateway (tenet 1)",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  {
    files: ["**/*.config.{ts,js}", "eslint.config.js"],
    rules: { "import-x/no-named-as-default": "off", "import-x/no-named-as-default-member": "off" },
  },
  { files: ["**/*.js"], ...tseslint.configs.disableTypeChecked },
  prettier,
);
