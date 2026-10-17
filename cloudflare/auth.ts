import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { type Env, RequestError } from './types';
import type { PersonId } from '../src/core/model';
const resolvers = new Map<string, JWTVerifyGetKey>();
export function authConfig(env: Env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const ryan = env.RYAN_EMAIL?.trim().toLowerCase(),
    lily = env.LILY_EMAIL?.trim().toLowerCase();
  if (
    !team ||
    !/^[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/.test(team) ||
    !env.CF_ACCESS_AUD ||
    !/^[a-f0-9]{64}$/i.test(env.CF_ACCESS_AUD) ||
    !ryan ||
    !lily ||
    ryan === lily ||
    ![ryan, lily].every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  )
    throw new RequestError(
      'Private deployment setup is incomplete. Configure Cloudflare Access and the two household email addresses in the server settings.',
      503,
    );
  return { team, ryan, lily, aud: env.CF_ACCESS_AUD };
}
export function tokenFrom(request: Request) {
  return (
    request.headers.get('Cf-Access-Jwt-Assertion') ??
    request.headers
      .get('Cookie')
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('CF_Authorization='))
      ?.slice('CF_Authorization='.length)
  );
}
export async function identity(
  request: Request,
  env: Env,
  key?: JWTVerifyGetKey,
): Promise<PersonId | null> {
  const config = authConfig(env),
    token = tokenFrom(request);
  if (!token) return null;
  let resolver = key ?? resolvers.get(config.team);
  if (!resolver) {
    resolver = createRemoteJWKSet(new URL(`https://${config.team}/cdn-cgi/access/certs`), {
      timeoutDuration: 5000,
    });
    resolvers.set(config.team, resolver);
  }
  let email: unknown;
  try {
    const { payload } = await jwtVerify(token, resolver, {
      issuer: `https://${config.team}`,
      audience: config.aud,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'email'],
      maxTokenAge: '7d',
      clockTolerance: 5,
    });
    email = payload.email;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JWKS_FETCH_FAILED')
      throw new RequestError('Private sign-in is temporarily unavailable. Try again shortly.', 503);
    throw new RequestError('Your private sign-in could not be verified. Sign in again.', 401);
  }
  if (typeof email !== 'string')
    throw new RequestError('Verified email identity is required.', 403);
  email = email.toLowerCase();
  if (email === config.ryan) return 'ryan';
  if (email === config.lily) return 'lily';
  throw new RequestError(
    'This planner is only available to the two authorized household members.',
    403,
  );
}
