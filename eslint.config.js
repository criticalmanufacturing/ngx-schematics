// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');

module.exports = defineConfig(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylistic
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true
      }
    },
    rules: {
      eqeqeq: [
        'error',
        'always',
        {
          null: 'ignore'
        }
      ],
      curly: 'error',
      'no-irregular-whitespace': 'error',
      'prefer-const': [
        'error',
        {
          destructuring: 'all'
        }
      ],
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn'
    }
  },
  {
    files: ['**/*_spec.ts'],
    rules: {}
  }
);
