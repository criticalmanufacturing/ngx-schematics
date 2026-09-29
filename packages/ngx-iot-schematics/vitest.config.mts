import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Use global test APIs (describe, it, expect)
    environment: 'node', // or 'jsdom' for browser-like tests
    include: ['**/*_spec.ts', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
