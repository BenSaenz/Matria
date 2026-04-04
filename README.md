# MATRIA · GitHub + Cloudflare Pages

Proyecto estático en HTML para tienda y panel interno de gestión.

## Archivos principales

- `index.html` → tienda pública
- `admin.html` → panel interno de gestión
- `assets/css/styles.css` → estilos globales
- `assets/js/app.js` → lógica de la tienda
- `assets/js/admin.js` → lógica del panel interno
- `assets/data/collections.json` → colecciones
- `assets/data/products.json` → productos
- `assets/data/coupons.json` → cupones
- `assets/img/` → imágenes físicas del sitio

## Estructura recomendada para imágenes

- `assets/img/collections/<slug-coleccion>/cover.webp`
- `assets/img/products/<slug-producto>/01.webp`
- `assets/img/products/<slug-producto>/02.webp`

## Cómo actualizar el sitio

1. Sube o reemplaza imágenes dentro de `assets/img/`.
2. Abre `admin.html` localmente o en tu entorno publicado.
3. Edita colecciones, productos y cupones.
4. Exporta `collections.json`, `products.json` y `coupons.json`.
5. Reemplaza esos archivos en `assets/data/` dentro de GitHub.
6. Haz commit y Cloudflare Pages publicará la nueva versión.

## Importante

- La tienda pública **no enlaza** al panel de gestión.
- El panel administra **rutas y metadatos** de imagen, no sube archivos al servidor.
- Los cambios del panel se guardan en `localStorage` hasta que exportes los JSON.
- Si cambias el número de WhatsApp, edita esta línea en `assets/js/app.js`:

```js
const WHATSAPP_NUMBER = '51999999999';
```

## Despliegue en Cloudflare Pages

- Build command: dejar vacío
- Output directory: `/`
- Framework preset: `None`

Como es un proyecto estático, GitHub + Cloudflare Pages funciona muy bien para este caso.
