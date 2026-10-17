// Isolated test infrastructure, never imported by the deployed Worker.
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { mkdtempSync, rmSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
export async function cloudflareFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'travel-worker-fixture-'));
  const scriptPath = join(dir, 'worker.mjs');
  await build({
    entryPoints: ['cloudflare/worker.ts'],
    outfile: scriptPath,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'],
    external: ['node:*'],
    logLevel: 'silent',
  });
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'worker-fixture-only';
  const team = 'synthetic-household.cloudflareaccess.com',
    aud = 'a'.repeat(64);
  const sign = (email: string) =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
      .setIssuer(`https://${team}`)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
  const tokens = {
    ryan: await sign('ryan@example.test'),
    lily: await sign('lily@example.test'),
    stranger: await sign('stranger@example.test'),
  };
  const assetRoot = resolve('dist');
  const mime: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.geojson': 'application/geo+json',
  };
  const mf = new Miniflare({
    modules: true,
    scriptPath,
    modulesRoot: dir,
    compatibilityDate: '2026-07-30',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    d1Persist: join(dir, 'database'),
    bindings: {
      CF_ACCESS_TEAM_DOMAIN: team,
      CF_ACCESS_AUD: aud,
      RYAN_EMAIL: 'ryan@example.test',
      LILY_EMAIL: 'lily@example.test',
    },
    outboundService: async (req: { url: string }) => {
      if (new URL(req.url).hostname !== team)
        throw new Error('Unexpected external request in isolated Worker test');
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
    serviceBindings: {
      ASSETS: async (request: { url: string }) => {
        let file = resolve(assetRoot, '.' + decodeURIComponent(new URL(request.url).pathname));
        if (!file.startsWith(assetRoot + '/') || !existsSync(file) || !statSync(file).isFile())
          file = join(assetRoot, 'index.html');
        if (!existsSync(file))
          return new Response('Run npm run build before the browser workflow.', { status: 503 });
        return new Response(readFileSync(file), {
          headers: {
            'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
            'Cache-Control': 'no-store',
          },
        });
      },
    },
  });
  try {
    await mf.ready;
  } catch (error) {
    await mf.dispose();
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
  return {
    mf,
    tokens,
    dir,
    async dispose() {
      await mf.dispose();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
