import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

const TILES_DIST = path.resolve(__dirname, '../../packages/tiles/dist');

function parseRangeHeader(header: string, fileSize: number): { start: number; end: number } | null {
  const match = header.match(/bytes=(\d+)-(\d+)?/);
  if (!match) return null;
  const start = Number.parseInt(match[1] ?? '0', 10);
  const end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
  return { start, end };
}

function serveTilesDevPlugin(): Plugin {
  return {
    name: 'serve-tiles-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/pmtiles', (req, res, next) => {
        const urlPath = (req.url ?? '').replace(/^\//, '');
        if (!urlPath || urlPath.includes('..')) {
          next();
          return;
        }
        const filePath = path.join(TILES_DIST, urlPath);
        fs.stat(filePath, (statErr, stat) => {
          if (statErr || !stat.isFile()) {
            next();
            return;
          }
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Type', 'application/octet-stream');

          const rangeHeader = req.headers['range'];
          if (rangeHeader) {
            const range = parseRangeHeader(rangeHeader, stat.size);
            if (range) {
              res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`);
              res.setHeader('Content-Length', range.end - range.start + 1);
              res.statusCode = 206;
              fs.createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
              return;
            }
          }
          res.setHeader('Content-Length', stat.size);
          res.statusCode = 200;
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [serveTilesDevPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id): string | undefined => {
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl') || id.includes('react-map-gl')) {
              return 'maplibre';
            }
            if (id.includes('pmtiles')) {
              return 'pmtiles';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
          }
          return undefined;
        },
      },
    },
  },
});
