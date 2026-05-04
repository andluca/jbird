import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.firecrawl/**",
      "**/.jbird/**",
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: [
      "packages/*/src/**/*.test.ts",
      "packages/*/src/**/tests/**/*.spec.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["eslint.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Layer rule: routers (commands/*/*.ts) cannot import services or integrations directly.
  // The composition root (jbird.ts) builds infrastructure and passes it as deps.
  {
    files: ["packages/cli/src/commands/*/*.ts"],
    ignores: ["packages/cli/src/commands/*/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/shared/services/*"],
              message:
                "Routers cannot import services. Pass deps from jbird.ts (composition root) or call the operation, which receives ports.",
              allowTypeImports: true,
            },
            {
              group: ["**/shared/integrations/*"],
              message:
                "Routers cannot import integrations. The composition root (jbird.ts) builds infrastructure and passes it as deps.",
            },
          ],
        },
      ],
    },
  },
  // Layer rule: operations (commands/*/*/*.ts) cannot import commander or integrations directly.
  // Operations receive parsed options as typed args, not Commander objects.
  {
    files: ["packages/cli/src/commands/*/*/*.ts"],
    ignores: [
      "packages/cli/src/commands/*/*/*.test.ts",
      "packages/cli/src/commands/*/*/tests/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["commander"],
              message:
                "Operations receive parsed options as typed args, not Commander objects. Argv parsing belongs to the router.",
            },
            {
              group: ["**/shared/integrations/*"],
              message:
                "Operations consume ports (interfaces from shared/services/ports.ts), not concrete integrations. Composition happens in jbird.ts.",
            },
          ],
        },
      ],
    },
  },
);
