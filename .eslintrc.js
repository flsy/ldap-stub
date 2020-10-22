module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['build', 'lib', 'node_modules'],
  extends: ['plugin:@typescript-eslint/recommended', 'prettier/@typescript-eslint', 'plugin:prettier/recommended'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/camelcase': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': 0,
    'import/no-named-as-default': 0,
    'consistent-return': 0,
    'max-len': [2, 180],
    'no-useless-return': 0,
    '@typescript-eslint/ban-types': 1,
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
  },
};