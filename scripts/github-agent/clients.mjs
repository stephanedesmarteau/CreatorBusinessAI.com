import { createPrivateKey, sign } from 'node:crypto';
import { ensure, REPOSITORY } from './policy.mjs';

export class RemoteError extends Error {
  constructor(status) { super(`REMOTE_HTTP_${status}`); this.status = status; }
}

async function jsonRequest(url, options, transport) {
  const response = await transport(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new RemoteError(response.status);
  if (response.status === 204) return null;
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('REMOTE_RESPONSE_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function githubApp(env, transport = fetch) {
  ensure(/^[1-9]\d*$/.test(env.BETA_AGENT_APP_ID ?? '') && env.BETA_AGENT_APP_PRIVATE_KEY, 'GITHUB_APP_NOT_CONFIGURED');
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: env.BETA_AGENT_APP_ID })}`;
  const jwt = `${body}.${sign('RSA-SHA256', Buffer.from(body), createPrivateKey(env.BETA_AGENT_APP_PRIVATE_KEY)).toString('base64url')}`;
  const make = (token) => async (method, path, data) => {
    ensure(path.startsWith(`/repos/${REPOSITORY}/`) || /^\/app(?:\/|$)/.test(path), 'GITHUB_ENDPOINT_DENIED');
    return jsonRequest('https://api.github.com' + path, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }, transport);
  };
  const app = make(jwt);
  const identity = await app('GET', '/app');
  ensure(String(identity.id) === env.BETA_AGENT_APP_ID && /^[a-z0-9-]+$/.test(identity.slug), 'GITHUB_APP_IDENTITY');
  const installation = await app('GET', `/repos/${REPOSITORY}/installation`);
  const access = await app('POST', `/app/installations/${installation.id}/access_tokens`, {
    repositories: [REPOSITORY.split('/')[1]],
    permissions: { contents: 'write', pull_requests: 'write', actions: 'read', checks: 'read', administration: 'read', issues: 'read', repository_hooks: 'read', pages: 'read' },
  });
  ensure(typeof access.token === 'string' && access.token.length > 0, 'GITHUB_APP_TOKEN_MISSING');
  return { request: make(access.token), botLogin: identity.slug + '[bot]' };
}

export function openaiClient(key, transport = fetch) {
  ensure(typeof key === 'string' && key.length > 0, 'OPENAI_AGENT_KEY_NOT_CONFIGURED');
  const call = (path, body) => jsonRequest(`https://api.openai.com/v1/responses${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, transport);
  // Aucun retry automatique : une réponse perdue garde la réservation entière.
  return { count: (body) => call('/input_tokens', body), create: (body) => call('', body) };
}
