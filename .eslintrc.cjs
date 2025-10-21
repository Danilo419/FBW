// .eslintrc.cjs
module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@next/next/no-html-link-for-pages": "off",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "prefer-const": "off",
    "react/no-unescaped-entities": "off"
  }
};
