# Gestión física de imágenes

Para GitHub + Cloudflare Pages, las imágenes deben vivir dentro del repositorio.

## Estructura sugerida

- `assets/img/collections/<slug-coleccion>/cover.webp`
- `assets/img/products/<slug-producto>/01.webp`
- `assets/img/products/<slug-producto>/02.webp`

## Flujo recomendado

1. Copia las imágenes optimizadas dentro de sus carpetas físicas.
2. En `admin.html`, registra la ruta relativa, por ejemplo:
   - `assets/img/collections/alba/cover.webp`
   - `assets/img/products/amanecer-interno/01.webp`
3. Exporta `collections.json`, `products.json` y `coupons.json`.
4. Reemplaza esos archivos en `assets/data/` dentro de GitHub.
5. Haz commit y Cloudflare Pages publicará la actualización.

El panel HTML administra **rutas y metadatos** de imagen, no sube archivos al servidor. Eso es lo más estable para un sitio estático.
