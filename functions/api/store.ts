import type { Env } from '../_shared/utils';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const result = await context.env.DB.prepare('SELECT 1 as ok').first();
  return new Response(JSON.stringify(result), {
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
};
