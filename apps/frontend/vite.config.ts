import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
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

function resolveSafeFilePath(urlPath: string): string | null {
  const normalized = (urlPath ?? '').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  return path.join(TILES_DIST, normalized);
}

function sendRangeResponse(
  res: ServerResponse,
  filePath: string,
  range: { start: number; end: number },
  fileSize: number,
): void {
  res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
  res.setHeader('Content-Length', range.end - range.start + 1);
  res.statusCode = 206;
  createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
}

function sendFullResponse(res: ServerResponse, filePath: string, fileSize: number): void {
  res.setHeader('Content-Length', fileSize);
  res.statusCode = 200;
  createReadStream(filePath).pipe(res);
}

function serveTilesDevPlugin(): Plugin {
  return {
    name: 'serve-tiles-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/pmtiles', async (req: IncomingMessage, res, next) => {
        const filePath = resolveSafeFilePath(req.url ?? '');
        if (!filePath) {
          next();
          return;
        }

        let stat: Awaited<ReturnType<typeof fs.stat>>;
        try {
          stat = await fs.stat(filePath);
        } catch {
          next();
          return;
        }
        if (!stat.isFile()) {
          next();
          return;
        }

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', 'application/octet-stream');

        const rangeHeader = req.headers['range'];
        const range = rangeHeader ? parseRangeHeader(rangeHeader, stat.size) : null;
        if (range) {
          sendRangeResponse(res, filePath, range, stat.size);
          return;
        }
        sendFullResponse(res, filePath, stat.size);
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
