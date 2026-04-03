# MATRIA · sitio HTML listo para GitHub + Cloudflare Pages

## Estructura

- `index.html`
- `assets/css/styles.css`
- `assets/js/app.js`
- `assets/data/products.json`

## Cómo editar productos

Abre `assets/data/products.json` y agrega un nuevo objeto siguiendo esta estructura:

```json
{
  "id": "vela-nueva",
  "name": "Vela Nueva",
  "category": "Velas",
  "format": "ritual",
  "price": 79.9,
  "discount": 10,
  "shortDescription": "Descripción corta.",
  "description": "Descripción larga.",
  "features": ["Detalle 1", "Detalle 2"],
  "media": [
    { "type": "image", "src": "assets/img/products/vela-nueva/01.jpg", "alt": "Texto alternativo" },
    { "type": "image", "src": "assets/img/products/vela-nueva/02.jpg", "alt": "Texto alternativo" },
    { "type": "video", "src": "assets/video/products/vela-nueva/ritual.mp4", "alt": "Video del producto" }
  ],
  "badge": "Nuevo"
}
```

## Subida a GitHub

1. Crea un repositorio nuevo.
2. Sube todo el contenido de esta carpeta.
3. Haz commit al branch principal.

## Despliegue en Cloudflare Pages

1. Entra a Cloudflare Pages.
2. Conecta tu cuenta de GitHub.
3. Selecciona el repositorio.
4. Usa estos valores:
   - Framework preset: `None`
   - Build command: dejar vacío
   - Build output directory: `/`
5. Deploy.

## Nota importante

El número de WhatsApp está en `assets/js/app.js`:

```js
const WHATSAPP_NUMBER = '51999999999';
```

Reemplázalo por el número real de MATRIA.
