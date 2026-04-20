import type { Env, Section } from './utils';
import { safeParseJson, touchRevision, readRevision } from './utils';

interface CollectionRow {
  id: string;
  code: string | null;
  name: string;
  title: string | null;
  tagline: string | null;
  story: string | null;
  pack_name: string | null;
  pack_story: string | null;
  cta_label: string | null;
  featured: number;
  show_on_home: number;
  sort_order: number;
  active: number;
  media_json: string | null;
}

interface ProductRow {
  id: string;
  collection_id: string | null;
  name: string;
  category: string;
  format: string | null;
  price: number;
  presentation_size: string | null;
  badge: string | null;
  technical_blend: string | null;
  sales_speech: string | null;
  short_description: string | null;
  description: string | null;
  descriptions_json: string | null;
  features_json: string | null;
  discount_enabled: number;
  discount_type: string | null;
  discount_value: number | null;
  media_json: string | null;
  variants_json: string | null;
  sort_order: number;
  active: number;
}

interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order: number;
  description: string | null;
  active: number;
}

interface ClientPhotoItem {
  id: string;
  clientName: string;
  role: string;
  quote: string;
  caption: string;
  src: string;
  alt: string;
  sortOrder: number;
  linkedCommentId: string;
  linkedPhotoId: string;
  active: boolean;
}

interface ClientCommentItem {
  id: string;
  author: string;
  role: string;
  quote: string;
  rating: number;
  sortOrder: number;
  linkedCommentId: string;
  active: boolean;
}

export async function getStorePayload(env: Env) {
  const [collectionsResult, productsResult, couponsResult, revision, clientPhotos, clientComments] = await Promise.all([
    env.DB.prepare(`SELECT * FROM collections ORDER BY sort_order ASC, name ASC`).all<CollectionRow>(),
    env.DB.prepare(`SELECT * FROM products ORDER BY sort_order ASC, name ASC`).all<ProductRow>(),
    env.DB.prepare(`SELECT * FROM coupons ORDER BY code ASC`).all<CouponRow>(),
    readRevision(env),
    loadClientPhotos(env),
    loadClientComments(env)
  ]);

  return {
    collections: (collectionsResult.results || []).map(mapCollectionRow),
    products: (productsResult.results || []).map(mapProductRow),
    coupons: (couponsResult.results || []).map(mapCouponRow),
    clientPhotos,
    clientComments,
    revision
  };
}

export async function replaceSection(env: Env, section: Section, payload: unknown[]) {
  switch (section) {
    case 'collections':
      await replaceCollections(env, payload as any[]);
      break;
    case 'products':
      await replaceProducts(env, payload as any[]);
      break;
    case 'coupons':
      await replaceCoupons(env, payload as any[]);
      break;
    case 'clientPhotos':
      await replaceClientPhotos(env, payload as any[]);
      break;
    case 'clientComments':
      await replaceClientComments(env, payload as any[]);
      break;
    default:
      throw new Error('Sección no soportada.');
  }

  return touchRevision(env, section);
}

async function replaceCollections(env: Env, collections: any[]) {
  const statements: D1PreparedStatement[] = [env.DB.prepare(`DELETE FROM collections`)];

  for (const item of collections) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO collections (
          id, code, name, title, tagline, story, pack_name, pack_story, cta_label,
          featured, show_on_home, sort_order, active, media_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        String(item.id || ''),
        nullable(item.code),
        String(item.name || 'Colección'),
        nullable(item.title || item.name),
        nullable(item.tagline),
        nullable(item.story),
        nullable(item.packName),
        nullable(item.packStory),
        nullable(item.ctaLabel),
        boolToInt(item.featured !== false),
        boolToInt(item.showOnHome !== false),
        Number(item.sortOrder || 0),
        boolToInt(item.active !== false),
        JSON.stringify(Array.isArray(item.media) ? item.media : [])
      )
    );
  }

  await env.DB.batch(statements);
}

async function replaceProducts(env: Env, products: any[]) {
  const statements: D1PreparedStatement[] = [env.DB.prepare(`DELETE FROM products`)];

  for (const item of products) {
    const discount = item.discount || {};
    statements.push(
      env.DB.prepare(`
        INSERT INTO products (
          id, collection_id, name, category, format, price, presentation_size, badge,
          technical_blend, sales_speech, short_description, description,
          descriptions_json, features_json, discount_enabled, discount_type,
          discount_value, media_json, variants_json, sort_order, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        String(item.id || ''),
        nullable(item.collectionId),
        String(item.name || 'Producto'),
        String(item.category || 'General'),
        nullable(item.format || 'ritual'),
        Number(item.price || 0),
        nullable(item.presentationSize),
        nullable(item.badge),
        nullable(item.technicalBlend),
        nullable(item.salesSpeech),
        nullable(item.shortDescription),
        nullable(item.description),
        JSON.stringify(Array.isArray(item.descriptions) ? item.descriptions : []),
        JSON.stringify(Array.isArray(item.features) ? item.features : []),
        boolToInt(Boolean(discount.enabled)),
        nullable(discount.type || 'percent'),
        Number(discount.value || 0),
        JSON.stringify(Array.isArray(item.media) ? item.media : []),
        JSON.stringify(Array.isArray(item.variants) ? item.variants : []),
        Number(item.sortOrder || 0),
        boolToInt(item.active !== false)
      )
    );
  }

  await env.DB.batch(statements);
}

async function replaceCoupons(env: Env, coupons: any[]) {
  const statements: D1PreparedStatement[] = [env.DB.prepare(`DELETE FROM coupons`)];

  for (const item of coupons) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO coupons (
          id, code, type, value, min_order, description, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        String(item.id || ''),
        String(item.code || '').toUpperCase(),
        String(item.type === 'fixed' ? 'fixed' : 'percent'),
        Number(item.value || 0),
        Number(item.minOrder || 0),
        nullable(item.description),
        boolToInt(item.active !== false)
      )
    );
  }

  await env.DB.batch(statements);
}

function mapCollectionRow(row: CollectionRow) {
  return {
    id: row.id,
    code: row.code || '',
    name: row.name,
    title: row.title || row.name,
    tagline: row.tagline || '',
    story: row.story || '',
    packName: row.pack_name || '',
    packStory: row.pack_story || '',
    ctaLabel: row.cta_label || 'Ver colección',
    featured: Boolean(row.featured),
    showOnHome: Boolean(row.show_on_home),
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
    media: safeParseJson(row.media_json, [])
  };
}

function mapProductRow(row: ProductRow) {
  return {
    id: row.id,
    collectionId: row.collection_id || '',
    name: row.name,
    category: row.category,
    format: row.format || 'ritual',
    price: Number(row.price || 0),
    badge: row.badge || '',
    presentationSize: row.presentation_size || '',
    technicalBlend: row.technical_blend || '',
    salesSpeech: row.sales_speech || '',
    shortDescription: row.short_description || '',
    description: row.description || '',
    descriptions: safeParseJson(row.descriptions_json, []),
    features: safeParseJson(row.features_json, []),
    discount: {
      enabled: Boolean(row.discount_enabled),
      type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
      value: Number(row.discount_value || 0)
    },
    media: safeParseJson(row.media_json, []),
    variants: safeParseJson(row.variants_json, []),
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active)
  };
}

function mapCouponRow(row: CouponRow) {
  return {
    id: row.id,
    code: row.code,
    type: row.type === 'fixed' ? 'fixed' : 'percent',
    value: Number(row.value || 0),
    minOrder: Number(row.min_order || 0),
    description: row.description || '',
    active: Boolean(row.active)
  };
}

function boolToInt(value: boolean) {
  return value ? 1 : 0;
}

function nullable(value: unknown) {
  const text = value == null ? '' : String(value).trim();
  return text ? text : null;
}


async function replaceClientPhotos(env: Env, items: any[]) {
  const sanitized = normalizeClientPhotoItems(items);

  await env.DB
    .prepare(`
      INSERT INTO meta (key, value, updated_at)
      VALUES ('client_photos', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .bind(JSON.stringify(sanitized))
    .run();
}

async function loadClientPhotos(env: Env) {
  const row = await env.DB
    .prepare(`SELECT value FROM meta WHERE key = 'client_photos' LIMIT 1`)
    .first<{ value: string | null }>();

  return normalizeClientPhotoItems(safeParseJson(row?.value || '[]', []));
}

function normalizeClientPhotoItems(items: any[]): ClientPhotoItem[] {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    id: String(item?.id || `client-photo-${index + 1}`),
    clientName: String(item?.clientName || item?.name || 'Cliente MATRIA'),
    role: String(item?.role || ''),
    quote: String(item?.quote || ''),
    caption: String(item?.caption || ''),
    src: String(item?.src || ''),
    alt: String(item?.alt || item?.clientName || 'Foto de cliente MATRIA'),
    sortOrder: Number(item?.sortOrder || 0),
    linkedCommentId: String(item?.linkedCommentId || ''),
    active: item?.active !== false
  })).filter(item => item.src);
}
