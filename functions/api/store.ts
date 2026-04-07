import type { Env, Section } from './utils';
import { safeParseJson, touchRevision, readRevision } from './utils';

export async function getStorePayload(env: Env) {
  const [collectionsResult, productsResult, couponsResult, revision] = await Promise.all([
    env.DB.prepare(`SELECT * FROM collections ORDER BY sort_order ASC, name ASC`).all<CollectionRow>(),
    env.DB.prepare(`SELECT * FROM products ORDER BY sort_order ASC, name ASC`).all<ProductRow>(),
    env.DB.prepare(`SELECT * FROM coupons ORDER BY code ASC`).all<CouponRow>(),
    readRevision(env)
  ]);

  return {
    collections: (collectionsResult.results || []).map(mapCollectionRow),
    products: (productsResult.results || []).map(mapProductRow),
    coupons: (couponsResult.results || []).map(mapCouponRow),
    revision
  };
}
