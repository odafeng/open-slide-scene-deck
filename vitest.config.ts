import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The template imports @open-slide/core hooks and image assets. Tests only exercise the camera math,
// so the framework is stubbed and images resolve to URL strings through Vite's asset pipeline.
export default defineConfig({
  resolve: {
    alias: {
      '@open-slide/core': fileURLToPath(new URL('./tests/stubs/open-slide-core.ts', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
