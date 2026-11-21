import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three alone is ~530 kB minified; not worth code-splitting for a demo.
    chunkSizeWarningLimit: 800,
  },
});
