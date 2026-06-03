import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/config/init.sql',
        'src/**/*.d.ts',
      ],
      thresholds: {
        branches: 55,
        functions: 50,
        lines: 18,
        statements: 18,
      },
    },
  },
});
