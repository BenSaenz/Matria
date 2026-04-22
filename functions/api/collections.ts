import type { Env } from '../_shared/utils';
import { getStorePayload, replaceSection } from '../_shared/store';

const corsHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const payload = await getStorePayload(env);
  return new Response(JSON.stringify(payload.collections), { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const items = await request.json();
    const revision = await replaceSection(env, 'collections', items);

    return new Response(
      JSON.stringify({ ok: true, revision }),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('SAVE COLLECTIONS ERROR', error?.message, error?.stack);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || 'Error guardando colecciones'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
