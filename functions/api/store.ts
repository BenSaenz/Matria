import type { Env } from '../_shared/utils';
import { json, optionsHandler } from '../_shared/utils';
import { getStorePayload } from '../_shared/store';

export const onRequestOptions: PagesFunction<Env> = async (context) => optionsHandler(context.request);

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const payload = await getStorePayload(context.env);
  return json(payload, 200, context.request);
};
