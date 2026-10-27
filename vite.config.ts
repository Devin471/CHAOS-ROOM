import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'netlify-functions-dev',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/.netlify/functions/game')) {
            try {
              const { handleGameRequest } = await import('./lib/game-handler.js');
              
              let bodyBuffer = Buffer.alloc(0);
              if (req.method === 'POST') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                }
                bodyBuffer = Buffer.concat(chunks);
              }

              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const host = req.headers.host || 'localhost:5173';
              const fullUrl = `${protocol}://${host}${req.url}`;

              const webReq = new Request(fullUrl, {
                method: req.method,
                headers: req.headers as HeadersInit,
                body: req.method === 'POST' ? bodyBuffer : undefined,
              });

              const webRes = await handleGameRequest(webReq);
              res.statusCode = webRes.status;
              webRes.headers.forEach((val, key) => {
                res.setHeader(key, val);
              });
              const responseText = await webRes.text();
              res.end(responseText);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: err?.message || 'Dev server function error' }));
            }
          } else {
            next();
          }
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
  },
});
