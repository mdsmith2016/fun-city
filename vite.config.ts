import { defineConfig, type Plugin } from 'vite';

const CLT_ENTRY = /^\/(CLT|clt)\/?$/;

/** Dev/preview: same SPA at `/CLT/` (and `/clt/` locally) so variant detection matches GitHub Pages. */
function cltPath(): Plugin {
  return {
    name: 'clt-path',
    configureServer(server) {
      // After Vite's own middleware so /@vite and /src still resolve normally.
      return () => {
        server.middlewares.use((req, _res, next) => {
          const r = req as { url?: string; method?: string };
          if (r.method && r.method !== 'GET' && r.method !== 'HEAD') return next();
          const url = r.url?.split('?')[0] ?? '';
          if (CLT_ENTRY.test(url)) r.url = '/index.html';
          next();
        });
      };
    },
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          const r = req as { url?: string; method?: string };
          if (r.method && r.method !== 'GET' && r.method !== 'HEAD') return next();
          const url = r.url?.split('?')[0] ?? '';
          if (CLT_ENTRY.test(url)) r.url = '/CLT/index.html';
          next();
        });
      };
    },
  };
}

export default defineConfig(({ command }) => ({
  // Dev: absolute `/src` imports from any path; production: relative assets for GitHub Pages subpaths.
  base: command === 'build' ? './' : '/',
  plugins: [cltPath()],
  build: {
    chunkSizeWarningLimit: 800,
  },
}));