module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-useless-escape': 'off',
  },
};
