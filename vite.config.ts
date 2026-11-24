import { defineConfig, type Plugin } from 'vite';

/** Dev/preview: load the same SPA at `/CLT` and `/CLT/` so pathname detection matches GitHub Pages. */
function cltPath(): Plugin {
  return {
    name: 'clt-path',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const r = req as { url?: string };
        const url = r.url?.split('?')[0] ?? '';
        if (url === '/CLT' || url === '/CLT/') r.url = '/';
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const r = req as { url?: string };
        const url = r.url?.split('?')[0] ?? '';
        if (url === '/CLT' || url === '/CLT/') r.url = '/CLT/index.html';
        next();
      });
    },
  };
}

export default defineConfig({
  // Relative asset paths so each build works at repo root or under /CLT/ on GitHub Pages.
  base: './',
  plugins: [cltPath()],
  build: {
    chunkSizeWarningLimit: 800,
  },
});