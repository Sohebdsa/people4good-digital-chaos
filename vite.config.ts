import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Dev-only endpoint used by the sprite studio (sprites.html) to write rendered PNGs into
 * public/assets/sprites. It only exists on the dev server (`apply: 'serve'`), accepts PNG data
 * URLs and refuses any path outside the sprites folder.
 */
function spriteSaver(): Plugin {
  const root = path.resolve(__dirname, 'public/assets/sprites');
  return {
    name: 'p4g-sprite-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__sprite-save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const { file, dataUrl } = JSON.parse(body) as { file: string; dataUrl: string };
            const out = path.resolve(root, file);
            if (!out.startsWith(root + path.sep) || !/\.png$/.test(out) || !dataUrl.startsWith('data:image/png;base64,')) {
              res.statusCode = 400;
              return res.end('bad request');
            }
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64'));
            res.end('ok');
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), spriteSaver()],
  // `npm run server` in another terminal provides the shared leaderboard during development
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) only accepts the function form
        manualChunks(id: string) {
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three';
          if (/[\\/]node_modules[\\/]jspdf(-autotable)?[\\/]/.test(id)) return 'pdf';
        },
      },
    },
  },
});
