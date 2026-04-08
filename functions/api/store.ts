import type { Env } from '../_shared/utils';

export const onRequestGet: PagesFunction<Env> = async (context) => {
const products = await context.env.DB
  .prepare('SELECT * FROM products LIMIT 5')
  .all();

  return new Response(JSON.stringify(collections), {
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
};
