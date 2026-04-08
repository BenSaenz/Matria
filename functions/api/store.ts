import type { Env } from '../_shared/utils';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const coupons = await context.env.DB
    .prepare('SELECT * FROM coupons LIMIT 5')
    .all();

  return new Response(JSON.stringify(coupons), {
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
};
