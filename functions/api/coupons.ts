import type { Env } from '../_shared/utils';
import { json, optionsHandler, parseJsonBody, requireAdmin } from '../_shared/utils';
import { getStorePayload, replaceSection } from '../_shared/store';

export const onRequestOptions: PagesFunction<Env> = async (context) => optionsHandler(context.request);

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const payload = await getStorePayload(context.env);
  return json({ section: 'coupons', data: payload.coupons, revision: payload.revision }, 200, context.request);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const authError = await requireAdmin(context.request, context.env);
  if (authError) return authError;

  const parsed = await parseJsonBody<unknown[]>(context.request);
  if (!parsed.ok) return parsed.response;
  if (!Array.isArray(parsed.data)) return json({ error: 'Se esperaba un arreglo JSON.' }, 400, context.request);

  const revision = await replaceSection(context.env, 'coupons', parsed.data);
  return json({ ok: true, section: 'coupons', revision }, 200, context.request);
};
