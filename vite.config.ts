import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built site works from any folder or GitHub Pages subpath.
  base: './',
  build: {
    // three alone is ~530 kB minified; not worth code-splitting for a demo.
    chunkSizeWarningLimit: 800,
  },
});
