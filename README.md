# MATRIA · GitHub + Cloudflare Pages

Proyecto HTML/CSS/JS listo para publicar en GitHub y desplegar en Cloudflare Pages.

## Estructura

- `index.html` → tienda principal
- `admin.html` → panel de gestión local de productos y cupones
- `assets/css/styles.css` → estilos globales
- `assets/js/app.js` → lógica de tienda, carrito, cupón y WhatsApp
- `assets/js/admin.js` → lógica de administración
- `assets/data/products.json` → catálogo base
- `assets/data/coupons.json` → cupones base

## Cómo funciona la administración

Este proyecto es **100% estático**. Por eso, la página `admin.html`:

- sí permite crear, editar y eliminar productos
- sí permite agregar o quitar imágenes y videos
- sí permite agregar o quitar descuentos por porcentaje o por valor fijo
- sí permite editar descripciones cortas y largas
- sí permite crear, editar y eliminar cupones por porcentaje o valor fijo
- sí permite exportar JSON actualizado

Pero, al estar en GitHub + Cloudflare Pages sin backend:

- los cambios **no escriben automáticamente** en los archivos del repositorio
- los cambios se guardan en el **localStorage del navegador**
- para publicar cambios permanentes debes **exportar el JSON** y reemplazar manualmente los archivos dentro de `assets/data/`

## Flujo recomendado de trabajo

1. Abre `admin.html`
2. Crea o edita productos y cupones
3. Exporta `products.json` y `coupons.json`
4. Sustituye esos archivos en `assets/data/`
5. Haz commit y push a GitHub
6. Cloudflare Pages publicará la actualización

## Personalización importante

En `assets/js/app.js`, cambia el número:

```js
const WHATSAPP_NUMBER = '51999999999';
```

por tu número real en formato internacional, por ejemplo:

```js
const WHATSAPP_NUMBER = '51923456789';
```

## Subida a GitHub

1. Crea un repositorio nuevo
2. Sube todos los archivos de esta carpeta
3. Verifica que `index.html` quede en la raíz

## Publicación en Cloudflare Pages

1. Entra a Cloudflare Pages
2. Conecta tu cuenta de GitHub
3. Selecciona el repositorio
4. Framework preset: `None`
5. Build command: dejar vacío
6. Build output directory: `/`
7. Deploy

## Nota sobre persistencia real

Si luego quieres que `admin.html` escriba cambios directamente sin exportar JSON manual, necesitarás un backend o servicio adicional, por ejemplo:

- Cloudflare Workers + KV / D1
- Supabase
- Firebase
- CMS headless

