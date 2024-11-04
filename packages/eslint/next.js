import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginOnlyWarn from "eslint-plugin-only-warn";
import path from "path";
import { fileURLToPath } from "url";
import globals from "globals";
import vercelNext from "@vercel/style-guide/eslint/next";
import turboPlugin from 'eslint-plugin-turbo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  {
    ignores: [
      // Ignore dotfiles
      ".*.js",
      "node_modules/",
      ".next/"
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      ["only-warn"]: eslintPluginOnlyWarn,
    },
  },
  js.configs.recommended,
  // ...compat.config(vercelNext),
  ...compat.extends("turbo"),
  ...tseslint.config({
    files: ["**/*.js?(x)", "**/*.ts?(x)"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.?(m)js"],
        },
      },
    },
  }),
  eslintConfigPrettier
);
