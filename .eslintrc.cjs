// .eslintrc.cjs
module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  parser: require.resolve("@typescript-eslint/parser"),
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: undefined // evita erros de configuração em builds
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ],
    "react-hooks/exhaustive-deps": "warn",
    "@next/next/no-html-link-for-pages": "off",
    "prefer-const": "off",
    "react/no-unescaped-entities": "off"
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "build/",
    "next-env.d.ts"
  ]
};
