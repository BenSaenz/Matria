type Env = {
  DB: D1Database;
};

type MediaItem = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  sortOrder?: number;
};

type SectionItem = {
  title?: string;
  body?: string;
};

type CollectionRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  concept?: string | null;
  description?: string | null;
  image_src?: string | null;
  image_alt?: string | null;
  image_title?: string | null;
  image_caption?: string | null;
  sort_order?: number | string | null;
  is_active?: number | string | boolean | null;
};

type ProductRow = {
  id: string;
  collection_id?: string | null;
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  format?: string | null;
  price?: number | string | null;
  badge?: string | null;
  technical_blend?: string | null;
  short_description?: string | null;
  description?: string | null;
  discount_type?: string | null;
  discount_value?: number | string | null;
  is_active?: number | string | boolean | null;
  sort_order?: number | string | null;
  media_json?: string | null;
  sections_json?: string | null;
};

type CouponRow = {
  id?: string | null;
  code?: string | null;
  discount_type?: string | null;
  discount_value?: number | string | null;
  is_active?: number | string | boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | string | null;
};

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'si', 'sí'].includes(normalized)) return true;
    if (['0', 'false', 'no'].includes(normalized)) return false;
  }
  return fallback;
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseMedia(value: unknown): MediaItem[] {
  const items = safeParseJson<unknown[]>(value, []);
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const raw = item as Record<string, unknown>;
      const src = toText(raw.src);

      if (!src) return null;

      const rawType = toText(raw.type, 'image');
      const type: 'image' | 'video' = rawType === 'video' ? 'video' : 'image';

      return {
        type,
        src,
        alt: toText(raw.alt),
        title: toText(raw.title),
        caption: toText(raw.caption),
        sortOrder: toNumber(raw.sortOrder, 0)
      };
    })
    .filter(Boolean) as MediaItem[];
}

function parseSections(value: unknown): SectionItem[] {
  const items = safeParseJson<unknown[]>(value, []);
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const raw = item as Record<string, unknown>;
      return {
        title: toText(raw.title),
        body: toText(raw.body)
      };
    })
    .filter(Boolean) as SectionItem[];
}

function mapCollectionRow(row: CollectionRow) {
  return {
    id: row.id,
    slug: row.slug || row.id,
    name: row.name || '',
    concept: row.concept || '',
    description: row.description || '',
    imageSrc: row.image_src || '',
    imageAlt: row.image_alt || '',
    imageTitle: row.image_title || '',
    imageCaption: row.image_caption || '',
    sortOrder: toNumber(row.sort_order, 0),
    isActive: toBoolean(row.is_active, true)
  };
}

function mapProductRow(row: ProductRow) {
  return {
    id: row.id,
    slug: row.slug || row.id,
    collectionId: row.collection_id || '',
    name: row.name || '',
    category: row.category || '',
    format: row.format || '',
    price: toNumber(row.price, 0),
    badge: row.badge || '',
    technicalBlend: row.technical_blend || '',
    shortDescription: row.short_description || '',
    description: row.description || '',
    discountType: row.discount_type || '',
    discountValue: toNumber(row.discount_value, 0),
    isActive: toBoolean(row.is_active, true),
    sortOrder: toNumber(row.sort_order, 0),
    media: parseMedia(row.media_json),
    sections: parseSections(row.sections_json)
  };
}

function mapCouponRow(row: CouponRow) {
  return {
    id: row.id || row.code || '',
    code: toText(row.code).toUpperCase(),
    discountType: row.discount_type || '',
    discountValue: toNumber(row.discount_value, 0),
    isActive: toBoolean(row.is_active, true),
    startsAt: row.starts_at || '',
    endsAt: row.ends_at || '',
    usageLimit:
      row.usage_limit === null || row.usage_limit === undefined || row.usage_limit === ''
        ? null
        : toNumber(row.usage_limit, 0)
  };
}

async function readRevision(env: Env): Promise<number> {
  try {
    const row = await env.DB.prepare(
      `SELECT value FROM meta WHERE key = 'revision' LIMIT 1`
    ).first<{ value?: string | number | null }>();

    if (!row?.value) return Date.now();

    const revision = Number(row.value);
    return Number.isFinite(revision) ? revision : Date.now();
  } catch {
    return Date.now();
  }
}

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
