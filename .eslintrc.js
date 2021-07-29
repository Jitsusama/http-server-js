module.exports = {
  root: true,
  env: { es6: true, browser: false, node: true, jest: true },
  parser: "@babel/eslint-parser",
  parserOptions: { requireConfigFile: false },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:node/recommended",
    "plugin:prettier/recommended",
    "plugin:promise/recommended",
    "plugin:unicorn/recommended",
  ],
  rules: {
    // internal imports must include a file extension
    "import/extensions": ["error", "always"],
    // imports must be sorted
    "import/order": ["warn", { alphabetize: { order: "asc" } }],
    // we are not ready for modules yet because jest isn't ready
    // see https://github.com/facebook/jest/issues/9430
    "unicorn/prefer-module": "off",
  },
  overrides: [
    // eslint rules that should only be applied to test modules
    {
      files: ["jest.setup.js", "**/*.test.js"],
      extends: ["plugin:jest/recommended"],
      rules: { "node/no-unpublished-require": "off" },
    },
  ],
};
