// @ts-check
const { defineConfig } = require('eslint/config');
const rootConfig = require('../../eslint.config.js');

module.exports = defineConfig([
  rootConfig,
  {
    ignores: ['**/*.d.ts', '**/fixtures/**']
  }
]);
