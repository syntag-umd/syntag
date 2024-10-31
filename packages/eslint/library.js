import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginOnlyWarn from "eslint-plugin-only-warn";
import path from "path";
import { fileURLToPath } from "url";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Basic configuration from ESLint
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json", // Ensure you have a valid tsconfig.json file
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },
    rules: {
      // Add TypeScript-specific rules or extend recommended ones
    },
  },

  // Prettier configuration to disable ESLint formatting rules
  eslintConfigPrettier,

  // Only-Warn Plugin to turn all rules into warnings
  {
    plugins: {
      "only-warn": eslintPluginOnlyWarn,
    },
  },

  // Additional compatibility configuration, if needed
  ...compat.extends("turbo"),
];
