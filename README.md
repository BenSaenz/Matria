# MATRIA · GitHub + Cloudflare Pages + D1

Proyecto HTML para tienda pública y panel de administración con sincronización automática usando **Cloudflare Pages Functions + D1**.

## Estructura

- `index.html` → tienda pública
- `admin.html` → panel de administración
- `assets/css/styles.css` → estilos globales
- `assets/js/app.js` → lógica de tienda
- `assets/js/admin.js` → lógica de administración
- `assets/data/*.json` → respaldo estático y referencia
- `functions/api/*.ts` → API automática bajo `/api/*`
- `functions/_shared/*.ts` → utilidades D1
- `migrations/*.sql` → esquema y seed inicial
- `wrangler.jsonc` → binding de D1

## Qué hace

- `index.html` lee colecciones, productos y cupones desde `/api/store`
- `admin.html` guarda cambios en D1 con `PUT /api/collections`, `PUT /api/products` y `PUT /api/coupons`
- cuando admin guarda, actualiza `localStorage` con una revisión y la tienda se refresca sola en otra pestaña por el evento `storage`
- si la API falla, la tienda puede seguir usando el respaldo estático de `assets/data/*.json`

## Antes de publicar

1. Reemplaza `REPLACE_WITH_YOUR_D1_DATABASE_ID` en `wrangler.jsonc`
2. Cambia el número de WhatsApp en `assets/js/app.js`
3. Si usarás seguridad, define `ADMIN_TOKEN` en Cloudflare Pages

## Configuración rápida

```bash
npm install
npx wrangler d1 migrations apply matria --remote
npx wrangler d1 execute matria --remote --file=./migrations/0002_seed.sql
```

## Deploy recomendado

1. Sube todo este proyecto a GitHub
2. Conecta el repo a Cloudflare Pages
3. En tu proyecto Pages agrega el binding D1 con nombre `DB`
4. Redeploya
5. Prueba estas rutas:
   - `/api/health`
   - `/api/store`
   - `/admin.html`

## Nota importante

La fuente de verdad ya es **D1**. Los archivos JSON son solo respaldo y punto de partida.
