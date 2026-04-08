import { getStorePayload } from '../_shared/store';

export const onRequestGet: PagesFunction = async (context) => {
  const payload = await getStorePayload(context.env as any);

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
};
