export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
}

export type Section = 'collections' | 'products' | 'coupons';

export function json(data: unknown, status = 200, request?: Request): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request)
    }
  });
}

export function corsHeaders(request?: Request): HeadersInit {
  const origin = request?.headers.get('Origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,PUT,OPTIONS',
    'access-control-allow-headers': 'Content-Type, X-Admin-Token',
    'vary': 'Origin'
  };
}

export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const expected = env.ADMIN_TOKEN?.trim();
  if (!expected) return null;

  const incoming = (request.headers.get('x-admin-token') || '').trim();
  if (incoming !== expected) {
    return json({ error: 'No autorizado.' }, 401, request);
  }
  return null;
}

export async function parseJsonBody<T>(request: Request): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  try {
    const data = await request.json() as T;
    return { ok: true, data };
  } catch {
    return { ok: false, response: json({ error: 'El cuerpo debe ser JSON válido.' }, 400, request) };
  }
}

export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function touchRevision(env: Env, resource: Section | 'seed' = 'seed') {
  const revision = JSON.stringify({
    id: crypto.randomUUID(),
    resource,
    at: new Date().toISOString()
  });

  await env.DB
    .prepare(`
      INSERT INTO meta (key, value, updated_at)
      VALUES ('store_revision', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .bind(revision)
    .run();

  return JSON.parse(revision);
}

export async function readRevision(env: Env) {
  const row = await env.DB
    .prepare(`SELECT value FROM meta WHERE key = 'store_revision' LIMIT 1`)
    .first<{ value: string }>();

  return safeParseJson(row?.value, null);
}

export async function optionsHandler(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
