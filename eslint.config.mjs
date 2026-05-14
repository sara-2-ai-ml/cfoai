import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

/** Ignore generated/build output so `eslint .` only targets source. */
const globalIgnores = {
  ignores: [".next/**", "node_modules/**", "out/**", "dist/**", "coverage/**"]
};

const config = [globalIgnores, ...compat.extends("next/core-web-vitals")];

export default config;
