# Tienda web

Catálogo de productos con carrito, descuento de stock al comprar, panel de administración con login por código, datos en MockAPI y hosting en GitHub Pages.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` + `app.js` | Tienda: búsqueda, filtros, orden, carrito y comprobante. Al comprar resta el stock en la API. |
| `admin.html` + `admin.js` | Login (usuario/contraseña en `config.js`), resumen de inventario y CRUD de productos y categorías. |
| `api.js` | Acceso a MockAPI (o localStorage en modo demo). Detecta solo los nombres de campo reales. |
| `config.js` | **URL de MockAPI**, recursos, credenciales del admin y nombre de la tienda. |
| `theme.js` | Botón de tema claro/oscuro (se recuerda la elección). |
| `styles.css` | Estilos (incluye los dos temas y el carrusel). |

## 1. MockAPI

URL conectada: `https://6af5c83df6270fa08d689c4e.mockapi.io/api/ai/producto`

En `config.js`:

```js
API_URL: "https://6af5c83df6270fa08d689c4e.mockapi.io/api/ai",
RESOURCES: { products: "producto", categories: "categoria" },
```

Campos del recurso `producto` (la app reconoce estos nombres u otros parecidos, por ejemplo `nome` o `nombre`):

- `name` (String), `price` (Number), `stock` (Number), `image` (String)
- Categoría, de una de estas dos formas:
  - Texto simple en el campo `category` (no necesitas otro recurso), o
  - Recurso `categoria` con el campo `name` y `categoryId` en cada producto.

## 2. Login del admin

En `config.js`: `ADMIN_USER` y `ADMIN_PASS` (por defecto `admin` / `1234`). Cámbialos antes de la defensa.

## 3. GitHub Pages

1. Sube todos los archivos a la raíz de un repositorio.
2. **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. Tu sitio queda en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

## Para la defensa

- Mostrar el carrusel de productos (cambia cada 4 segundos) y el botón de tema claro/oscuro.
- Mostrar el catálogo, buscar, filtrar y ordenar.
- Agregar productos al carrito y comprar: el comprobante aparece y el **stock baja** (también en MockAPI).
- Entrar al admin con datos incorrectos y luego correctos.
- Crear, editar y eliminar un producto.
- Mostrar la URL publicada en GitHub Pages.
