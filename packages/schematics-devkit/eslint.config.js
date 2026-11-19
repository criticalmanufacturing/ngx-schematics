// @ts-check
const { defineConfig, includeIgnoreFile } = require('eslint/config');
const { join } = require('node:path');
const rootConfig = require('../../eslint.config.js');

module.exports = defineConfig([
  rootConfig,
  includeIgnoreFile(join(__dirname, '../../.gitignore'), { gitignoreResolution: true }),
  {
    ignores: ['**/*.d.ts', '**/fixtures/**']
  }
]);
