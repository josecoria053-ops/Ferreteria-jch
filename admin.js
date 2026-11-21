// ============================================
// ADMIN: login por código + CRUD de productos y categorías
// ============================================
const $ = (s) => document.querySelector(s);

let products = [];
let categories = [];
let hasCategoryResource = false; // true si el recurso de categorías existe en la API

if (!API.remote) $("#demoBanner").classList.remove("hidden");

let toastTimer;
function toast(msg, error = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (error ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2800);
}

// ---------- Login (usuario y contraseña definidos en config.js) ----------
const isLogged = () => sessionStorage.getItem("admin_ok") === "1";

function showPanel() {
  const logged = isLogged();
  $("#loginForm").classList.toggle("hidden", logged);
  $("#panel").classList.toggle("hidden", !logged);
  $("#logout").classList.toggle("hidden", !logged);
  if (logged) load();
}

$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("#user").value === CONFIG.ADMIN_USER && $("#pass").value === CONFIG.ADMIN_PASS) {
    sessionStorage.setItem("admin_ok", "1");
    $("#loginError").textContent = "";
    $("#pass").value = "";
    showPanel();
  } else {
    $("#loginError").textContent = "Usuario o contraseña incorrectos.";
    $("#pass").select();
  }
});

$("#logout").addEventListener("click", () => {
  sessionStorage.removeItem("admin_ok");
  showPanel();
});

// ---------- Carga ----------
async function load() {
  try {
    let list = [];
    try { list = await API.list("categories"); hasCategoryResource = true; } catch (e) { hasCategoryResource = false; }
    products = await API.list("products");
    categories = hasCategoryResource ? list : categoriesFor([], products);
  } catch (e) {
    return toast("Error al cargar: " + e.message, true);
  }
  renderStats();
  renderCategorySelect();
  renderProducts();
  renderCategories();
}

const catName = (p) => categories.find((c) => String(c.id) === String(catKey(p)))?.name || p.category || "—";

function renderStats() {
  const units = products.reduce((a, p) => a + p.stock, 0);
  const value = products.reduce((a, p) => a + p.stock * p.price, 0);
  const low = products.filter((p) => p.stock <= CONFIG.LOW_STOCK).length;
  $("#sProducts").textContent = products.length;
  $("#sUnits").textContent = units.toLocaleString("es-BO");
  $("#sValue").textContent = money(value);
  $("#sLow").textContent = low;
}

// ---------- Productos ----------
function renderCategorySelect() {
  const sel = $("#pCategory");
  const current = sel.value;
  sel.innerHTML =
    `<option value="">Sin categoría</option>` +
    categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  sel.value = current;
  // Sin recurso de categorías: se escribe el nombre libremente
  sel.classList.toggle("hidden", !hasCategoryResource);
  $("#pCategoryText").classList.toggle("hidden", hasCategoryResource);
  $("#catList").innerHTML = categories.map((c) => `<option value="${esc(c.name)}">`).join("");
  $("#categoryPanel").classList.toggle("hidden", !hasCategoryResource);
}

function stockBadge(n) {
  if (n === 0) return `<span class="badge out inline">Agotado</span>`;
  if (n <= CONFIG.LOW_STOCK) return `<span class="badge low inline">${n} · bajo</span>`;
  return `<span class="badge ok inline">${n}</span>`;
}

function renderProducts() {
  const q = $("#adminSearch").value.trim().toLowerCase();
  const list = products.filter((p) => p.name.toLowerCase().includes(q));
  $("#productRows").innerHTML = list.length
    ? list
        .map(
          (p) => `
      <tr>
        <td><img src="${esc(p.image || PLACEHOLDER)}" alt="" /></td>
        <td><strong>${esc(p.name)}</strong></td>
        <td>${esc(catName(p))}</td>
        <td>${money(p.price)}</td>
        <td>${stockBadge(p.stock)}</td>
        <td class="actions">
          <button class="btn secondary small" data-edit="${esc(p.id)}">Editar</button>
          <button class="btn danger small" data-del="${esc(p.id)}">Eliminar</button>
        </td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="6" class="empty-cell">${products.length ? "Ningún producto coincide con la búsqueda." : "Aún no hay productos. Crea el primero con el formulario de arriba."}</td></tr>`;
}

function resetForm() {
  $("#productForm").reset();
  $("#pId").value = "";
  $("#formTitle").textContent = "Nuevo producto";
  $("#saveBtn").textContent = "Guardar producto";
  $("#cancelEdit").classList.add("hidden");
}

$("#adminSearch").addEventListener("input", renderProducts);

$("#productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("#pName").value.trim(),
    price: Number($("#pPrice").value),
    stock: Math.max(0, parseInt($("#pStock").value, 10) || 0),
    image: $("#pImage").value.trim(),
  };
  if (hasCategoryResource) data.categoryId = $("#pCategory").value;
  else data.category = $("#pCategoryText").value.trim();

  const id = $("#pId").value;
  const btn = $("#saveBtn");
  btn.disabled = true;
  try {
    if (id) await API.update("products", id, data);
    else await API.create("products", data);
    toast(id ? "Producto actualizado" : "Producto creado");
    resetForm();
    await load();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

$("#cancelEdit").addEventListener("click", resetForm);

$("#productRows").addEventListener("click", async (e) => {
  const editId = e.target.closest("[data-edit]")?.dataset.edit;
  const delId = e.target.closest("[data-del]")?.dataset.del;

  if (editId) {
    const p = products.find((x) => String(x.id) === String(editId));
    if (!p) return;
    $("#pId").value = p.id;
    $("#pName").value = p.name;
    $("#pPrice").value = p.price;
    $("#pStock").value = p.stock;
    $("#pCategory").value = p.categoryId || "";
    $("#pCategoryText").value = p.category || "";
    $("#pImage").value = p.image || "";
    $("#formTitle").textContent = "Editando: " + p.name;
    $("#saveBtn").textContent = "Guardar cambios";
    $("#cancelEdit").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("#pName").focus({ preventScroll: true });
  }

  if (delId) {
    const p = products.find((x) => String(x.id) === String(delId));
    if (!confirm(`¿Eliminar "${p?.name || "este producto"}"? Esta acción no se puede deshacer.`)) return;
    try {
      await API.remove("products", delId);
      toast("Producto eliminado");
      load();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

// ---------- Categorías ----------
function renderCategories() {
  $("#categoryRows").innerHTML = categories.length
    ? categories
        .map(
          (c) => `
      <tr>
        <td>${esc(c.name)}</td>
        <td class="actions"><button class="btn danger small" data-delcat="${esc(c.id)}">Eliminar</button></td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="2" class="empty-cell">Sin categorías.</td></tr>`;
}

$("#categoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await API.create("categories", { name: $("#cName").value.trim() });
    $("#cName").value = "";
    toast("Categoría agregada");
    load();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#categoryRows").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-delcat]")?.dataset.delcat;
  if (id && confirm("¿Eliminar esta categoría? Los productos que la usan quedarán sin categoría.")) {
    try {
      await API.remove("categories", id);
      toast("Categoría eliminada");
      load();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

showPanel();
