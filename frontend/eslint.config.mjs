import eslintConfigPrettier from "eslint-config-prettier";
import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [...nextConfig, eslintConfigPrettier];

export default config;
