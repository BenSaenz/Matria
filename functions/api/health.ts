import type { Env } from '../_shared/utils';
import { json, optionsHandler } from '../_shared/utils';

export const onRequestOptions: PagesFunction<Env> = async (context) => optionsHandler(context.request);

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const row = await context.env.DB.prepare(`SELECT datetime('now') as now`).first<{ now: string }>();
  return json({ ok: true, now: row?.now || null }, 200, context.request);
};
