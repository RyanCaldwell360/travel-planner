// Test-only HTTP bridge. Its synthetic login endpoint is NOT part of the deployed app.
import { createServer } from 'node:http';
import { cloudflareFixture } from './cloudflare-fixture';
const fixture = await cloudflareFixture();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (url.pathname === '/__fixture/login') {
      const person = url.searchParams.get('person') as keyof typeof fixture.tokens;
      const token = fixture.tokens[person];
      if (!token) {
        res.writeHead(400);
        res.end();
        return;
      }
      res.writeHead(302, {
        'Set-Cookie': `CF_Authorization=${token}; HttpOnly; SameSite=Strict; Path=/`,
        Location: '/',
      });
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
    const body = Buffer.concat(chunks);
    const response = await fixture.mf.dispatchFetch(url.href, {
      method: req.method,
      headers: Object.fromEntries(headers),
      ...(body.length ? { body } : {}),
    });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end('Worker fixture failed');
  }
}).listen(3200, '127.0.0.1', () =>
  console.log('Isolated Cloudflare browser fixture listening on 3200'),
);
process.on('SIGTERM', () =>
  server.close(async () => {
    await fixture.dispose();
    process.exit(0);
  }),
);
