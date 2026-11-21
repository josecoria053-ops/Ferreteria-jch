// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
  // URL base de tu proyecto en MockAPI (sin "/" al final).
  // Si lo dejas vacío, la app funciona en modo DEMO usando localStorage.
  API_URL: "https://6af5c83df6270fa08d689c4e.mockapi.io/api/ai",

  // Recursos en MockAPI → https://6af5c83df6270fa08d689c4e.mockapi.io/api/ai/producto
  RESOURCES: {
    products: "producto",
    categories: "categoria", // opcional: si no existe, las categorías se toman del campo "category" de cada producto
  },

  // Nombres de campo preferidos al GUARDAR (campo de la app : campo en MockAPI).
  // Al LEER, api.js detecta solos los nombres reales (name/nome/nombre, price/precio, etc.),
  // así que si algún campo se llama distinto no se rompe la tienda.
  FIELDS: {
    products: { name: "name", price: "price", stock: "stock", image: "image", categoryId: "categoryId", category: "category" },
    categories: { name: "name" },
  },

  // Credenciales del admin (login por código, como pide la práctica)
  ADMIN_USER: "admin",
  ADMIN_PASS: "1234",

  // Identidad de la tienda
  STORE_NAME: "Mi Tienda",
  STORE_TAGLINE: "Productos seleccionados, stock siempre actualizado.",
  CURRENCY: "Bs",
  LOW_STOCK: 3, // desde este número se muestra "Últimas unidades"
};
