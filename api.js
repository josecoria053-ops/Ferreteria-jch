// ============================================
// CAPA DE DATOS: MockAPI (o modo demo con localStorage)
// Producto normalizado: { id, name, price, stock, image, categoryId, category }
// ============================================
const API = (() => {
  const remote = !!CONFIG.API_URL;

  // Alias aceptados al leer desde MockAPI (el primero que exista gana)
  const ALIASES = {
    name: ["name", "nome", "nombre", "title", "titulo"],
    price: ["price", "precio", "preco"],
    stock: ["stock", "cantidad", "existencias", "qty"],
    image: ["image", "imagen", "img", "avatar", "foto", "url"],
    categoryId: ["categoryId", "categoryid", "category_id", "categoriaId", "idCategoria"],
    category: ["category", "categoria"],
  };

  // Mapa campo-app → campo-real (se ajusta solo al ver los datos)
  const fieldMap = {};
  const preferred = (resource) => CONFIG.FIELDS?.[resource] || {};
  Object.entries(preferred("products")).forEach(([k, v]) => (fieldMap[k] = v));

  const seed = {
    categories: [
      { id: "1", name: "Tecnología" },
      { id: "2", name: "Hogar" },
      { id: "3", name: "Ropa" },
    ],
    products: [
      { id: "1", name: "Audífonos Bluetooth", price: 150, stock: 10, categoryId: "1", image: "" },
      { id: "2", name: "Teclado mecánico", price: 320, stock: 5, categoryId: "1", image: "" },
      { id: "3", name: "Lámpara de escritorio", price: 85, stock: 8, categoryId: "2", image: "" },
      { id: "4", name: "Polera básica", price: 60, stock: 20, categoryId: "3", image: "" },
      { id: "5", name: "Mochila urbana", price: 180, stock: 0, categoryId: "3", image: "" },
    ],
  };

  // ---- modo demo ----
  function ls(key) {
    try {
      const v = JSON.parse(localStorage.getItem("demo_" + key));
      if (v) return v;
    } catch (e) {}
    localStorage.setItem("demo_" + key, JSON.stringify(seed[key]));
    return JSON.parse(JSON.stringify(seed[key]));
  }
  const save = (key, value) => localStorage.setItem("demo_" + key, JSON.stringify(value));

  // ---- modo MockAPI ----
  async function req(path, opts = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(`${CONFIG.API_URL}/${path}`, {
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        ...opts,
      });
      if (!res.ok) throw new Error(res.status === 404 ? `No existe el recurso "${path.split("/")[0]}" en MockAPI` : `Error ${res.status} al consultar MockAPI`);
      return res.json();
    } catch (e) {
      if (e.name === "AbortError") throw new Error("MockAPI tardó demasiado en responder");
      if (e instanceof TypeError) throw new Error("No hay conexión con MockAPI");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  const rname = (resource) => CONFIG.RESOURCES?.[resource] || resource;

  // Detecta los nombres reales de campo a partir de los registros recibidos
  function detectFields(rows) {
    const keys = new Set(rows.flatMap((r) => Object.keys(r || {})));
    for (const [local, list] of Object.entries(ALIASES)) {
      const want = fieldMap[local];
      if (want && keys.has(want)) continue;
      const found = list.find((k) => keys.has(k));
      if (found) fieldMap[local] = found;
    }
  }

  function pick(obj, local) {
    for (const k of [fieldMap[local], ...ALIASES[local]]) {
      if (k && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return "";
  }

  function normProduct(o) {
    return {
      id: o.id,
      name: String(pick(o, "name") || "Producto sin nombre"),
      price: Number(pick(o, "price")) || 0,
      stock: Math.max(0, parseInt(pick(o, "stock"), 10) || 0),
      image: String(pick(o, "image") || ""),
      categoryId: String(pick(o, "categoryId") || ""),
      category: String(pick(o, "category") || ""),
    };
  }

  function toRemoteProduct(data) {
    const out = {};
    for (const [local, value] of Object.entries(data)) {
      out[fieldMap[local] || local] = value;
    }
    return out;
  }

  const normCategory = (o) => ({ id: String(o.id), name: String(o.name ?? o.nombre ?? o.nome ?? "") });
  const toRemoteCategory = (d) => ({ [preferred("categories").name || "name"]: d.name });

  const norm = (resource, o) => (resource === "products" ? normProduct(o) : normCategory(o));
  const toRemote = (resource, d) => (resource === "products" ? toRemoteProduct(d) : toRemoteCategory(d));

  return {
    remote,

    async list(resource) {
      if (!remote) return ls(resource);
      const arr = await req(rname(resource));
      if (!Array.isArray(arr)) return [];
      if (resource === "products") detectFields(arr);
      return arr.map((x) => norm(resource, x));
    },

    async get(resource, id) {
      if (remote) return norm(resource, await req(`${rname(resource)}/${id}`));
      return ls(resource).find((x) => String(x.id) === String(id));
    },

    async create(resource, data) {
      if (remote) {
        const created = await req(rname(resource), { method: "POST", body: JSON.stringify(toRemote(resource, data)) });
        return norm(resource, created);
      }
      const all = ls(resource);
      const item = { ...data, id: String(Date.now()) };
      all.push(item);
      save(resource, all);
      return item;
    },

    async update(resource, id, data) {
      if (remote) {
        const updated = await req(`${rname(resource)}/${id}`, { method: "PUT", body: JSON.stringify(toRemote(resource, data)) });
        return norm(resource, updated);
      }
      const all = ls(resource);
      const i = all.findIndex((x) => String(x.id) === String(id));
      if (i === -1) throw new Error("No encontrado");
      all[i] = { ...all[i], ...data };
      save(resource, all);
      return all[i];
    },

    async remove(resource, id) {
      if (remote) return req(`${rname(resource)}/${id}`, { method: "DELETE" });
      save(resource, ls(resource).filter((x) => String(x.id) !== String(id)));
      return {};
    },
  };
})();

// ---------- Utilidades compartidas ----------
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(n) {
  return `${CONFIG.CURRENCY} ${Number(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Imagen de reemplazo (no depende de internet)
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><g fill="none" stroke="#9aa9b8" stroke-width="8" stroke-linejoin="round"><path d="M150 120l50-30 50 30v60l-50 30-50-30z"/><path d="M150 120l50 30 50-30M200 150v60"/></g></svg>`
  );

// Si una imagen falla, se cambia por el reemplazo
document.addEventListener(
  "error",
  (e) => {
    const t = e.target;
    if (t.tagName === "IMG" && t.src !== PLACEHOLDER) t.src = PLACEHOLDER;
  },
  true
);

// Clave de categoría de un producto (id si existe, si no el texto)
const catKey = (p) => p.categoryId || p.category || "";

function categoriesFor(list, products) {
  if (list.length) return list;
  const names = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  return names.map((n) => ({ id: n, name: n }));
}
