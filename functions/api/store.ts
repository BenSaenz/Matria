import type { Env } from '../_shared/utils';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const collections = await context.env.DB
    .prepare('SELECT * FROM collections LIMIT 5')
    .all();

  return new Response(JSON.stringify(collections), {
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
};
