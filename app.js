// ============================================
// TIENDA: catálogo + carrito + descuento de stock
// ============================================
const $ = (s) => document.querySelector(s);

let products = [];
let categories = [];
let cart = [];
try { cart = JSON.parse(localStorage.getItem("cart") || "[]"); } catch (e) { cart = []; }

document.title = CONFIG.STORE_NAME;
$("#brand").textContent = CONFIG.STORE_NAME;
$("#footName").textContent = "© " + new Date().getFullYear() + " " + CONFIG.STORE_NAME;
$("#heroText").textContent = CONFIG.STORE_TAGLINE;
if (!API.remote) $("#demoBanner").classList.remove("hidden");

let toastTimer;
function toast(msg, error = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (error ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2800);
}

const saveCart = () => localStorage.setItem("cart", JSON.stringify(cart));
const findProduct = (id) => products.find((p) => String(p.id) === String(id));
const categoryName = (p) => categories.find((c) => String(c.id) === String(catKey(p)))?.name || p.category || "";

// ---------- Carga ----------
function showSkeleton() {
  $("#errorBox").classList.add("hidden");
  $("#empty").classList.add("hidden");
  $("#products").innerHTML = Array.from({ length: 8 }, () => `
    <article class="card skeleton" aria-hidden="true">
      <div class="img"></div>
      <div class="card-body"><i></i><i class="w60"></i><i class="w40"></i></div>
    </article>`).join("");
}

async function load() {
  if (!products.length) showSkeleton();
  try {
    const [p, c] = await Promise.all([API.list("products"), API.list("categories").catch(() => [])]);
    products = p;
    categories = categoriesFor(c, p);
  } catch (e) {
    $("#products").innerHTML = "";
    $("#errorMsg").textContent = e.message + ". Revisa tu conexión y la URL en config.js.";
    $("#errorBox").classList.remove("hidden");
    return;
  }
  $("#errorBox").classList.add("hidden");
  cart = cart.filter((c) => findProduct(c.id));
  cart.forEach((c) => { c.qty = Math.min(c.qty, findProduct(c.id).stock); });
  cart = cart.filter((c) => c.qty > 0);
  saveCart();
  renderStats();
  renderShowcase();
  renderCategories();
  renderProducts();
  renderCart();
}

function renderStats() {
  $("#statProducts").textContent = products.length;
  $("#statAvailable").textContent = products.filter((p) => p.stock > 0).length;
  $("#statCategories").textContent = categories.length;
}

function renderCategories() {
  const sel = $("#categoryFilter");
  const current = sel.value;
  sel.innerHTML =
    `<option value="">Todas las categorías</option>` +
    categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  sel.value = current;
  sel.classList.toggle("hidden", categories.length === 0);
}


// ---------- Carrusel de productos (cambia cada 4 segundos) ----------
const SLIDE_MS = 4000;
let slideIdx = 0;
let slideTimer = null;
let autoOn = true;      // el usuario puede pausarlo
let hoverPause = false; // pausa temporal al pasar el mouse o enfocar
let slideItems = [];

function renderShowcase() {
  // Primero los que tienen imagen y stock; máximo 6
  const rank = (p) => (p.image ? 0 : 2) + (p.stock > 0 ? 0 : 1);
  slideItems = [...products].sort((a, b) => rank(a) - rank(b)).slice(0, 6);
  const box = $("#showcase");
  box.classList.toggle("hidden", slideItems.length === 0);
  if (!slideItems.length) return stopSlides();

  slideIdx = Math.min(slideIdx, slideItems.length - 1);
  $("#slides").innerHTML = slideItems
    .map((p, i) => {
      const out = p.stock === 0;
      const cat = categoryName(p);
      return `
      <div class="slide${i === slideIdx ? " active" : ""}" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${slideItems.length}" ${i === slideIdx ? "" : 'aria-hidden="true"'}>
        <img src="${esc(p.image || PLACEHOLDER)}" alt="${esc(p.name)}" />
        <div class="slide-info">
          <div>
            ${cat ? `<span class="tag">${esc(cat)}</span>` : ""}
            <h3>${esc(p.name)}</h3>
            <span class="price">${money(p.price)}</span>
          </div>
          <button class="btn" data-add="${esc(p.id)}" ${out ? "disabled" : ""} ${i === slideIdx ? "" : 'tabindex="-1"'}>${out ? "Agotado" : "Agregar al carrito"}</button>
        </div>
      </div>`;
    })
    .join("");

  const multi = slideItems.length > 1;
  ["#prevSlide", "#nextSlide", "#toggleAuto"].forEach((s) => $(s).classList.toggle("hidden", !multi));
  $("#dots").innerHTML = multi
    ? slideItems.map((p, i) => `<button data-slide="${i}" aria-label="Ver ${esc(p.name)}" ${i === slideIdx ? 'aria-current="true"' : ""}></button>`).join("")
    : "";
  $(".progress").classList.toggle("hidden", !multi);
  if (multi) startSlides();
  else stopSlides();
}

function showSlide(i) {
  const n = slideItems.length;
  if (!n) return;
  slideIdx = (i + n) % n;
  document.querySelectorAll("#slides .slide").forEach((el, k) => {
    const on = k === slideIdx;
    el.classList.toggle("active", on);
    if (on) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
    el.querySelector("button")?.setAttribute("tabindex", on ? "0" : "-1");
  });
  document.querySelectorAll("#dots button").forEach((el, k) => {
    if (k === slideIdx) el.setAttribute("aria-current", "true");
    else el.removeAttribute("aria-current");
  });
}

function restartProgress() {
  const bar = $("#progressBar");
  bar.classList.remove("run");
  void bar.offsetWidth; // reinicia la animación
  bar.style.setProperty("--slide-ms", SLIDE_MS + "ms");
  if (autoOn) bar.classList.add("run");
}

function scheduleNext() {
  clearTimeout(slideTimer);
  restartProgress();
  if (!autoOn) return;
  slideTimer = setTimeout(tick, SLIDE_MS);
}

function tick() {
  // Si está en pausa temporal o la pestaña no se ve, espera otro ciclo
  if (hoverPause || document.hidden) return scheduleNext();
  showSlide(slideIdx + 1);
  scheduleNext();
}

function startSlides() { scheduleNext(); }
function stopSlides() { clearTimeout(slideTimer); }

function goTo(i) { showSlide(i); scheduleNext(); }

$("#prevSlide").addEventListener("click", () => goTo(slideIdx - 1));
$("#nextSlide").addEventListener("click", () => goTo(slideIdx + 1));
$("#dots").addEventListener("click", (e) => {
  const i = e.target.closest("[data-slide]")?.dataset.slide;
  if (i !== undefined) goTo(Number(i));
});
$("#toggleAuto").addEventListener("click", () => {
  autoOn = !autoOn;
  $("#toggleAuto").textContent = autoOn ? "Pausar" : "Reanudar";
  $("#toggleAuto").setAttribute("aria-label", autoOn ? "Pausar rotación automática" : "Reanudar rotación automática");
  scheduleNext();
});
const showcaseBox = $("#showcase");
const setHover = (v) => { hoverPause = v; showcaseBox.classList.toggle("paused", v); };
showcaseBox.addEventListener("mouseenter", () => setHover(true));
showcaseBox.addEventListener("mouseleave", () => setHover(false));
showcaseBox.addEventListener("focusin", () => setHover(true));
showcaseBox.addEventListener("focusout", () => setHover(false));
showcaseBox.addEventListener("click", (e) => {
  const id = e.target.closest("[data-add]")?.dataset.add;
  if (id) addToCart(id);
});

// ---------- Catálogo ----------
function visibleProducts() {
  const q = $("#search").value.trim().toLowerCase();
  const cat = $("#categoryFilter").value;
  const only = $("#onlyAvailable").checked;
  const sort = $("#sort").value;

  const list = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) &&
      (!cat || String(catKey(p)) === String(cat)) &&
      (!only || p.stock > 0)
  );
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return list;
}

function renderProducts() {
  const list = visibleProducts();
  $("#empty").classList.toggle("hidden", list.length > 0);
  $("#resultCount").textContent = `${list.length} de ${products.length} productos`;

  $("#products").innerHTML = list
    .map((p) => {
      const inCart = cart.find((c) => String(c.id) === String(p.id))?.qty || 0;
      const out = p.stock === 0;
      const low = !out && p.stock <= CONFIG.LOW_STOCK;
      const badge = out ? `<span class="badge out">Agotado</span>` : low ? `<span class="badge low">Últimas ${p.stock}</span>` : "";
      const cat = categoryName(p);
      return `
      <article class="card${out ? " is-out" : ""}">
        <div class="img">
          <img src="${esc(p.image || PLACEHOLDER)}" alt="${esc(p.name)}" loading="lazy" />
          ${badge}
        </div>
        <div class="card-body">
          ${cat ? `<span class="tag">${esc(cat)}</span>` : ""}
          <h3>${esc(p.name)}</h3>
          <div class="row">
            <span class="price">${money(p.price)}</span>
            <span class="stock">${out ? "Sin stock" : p.stock + " disponibles"}</span>
          </div>
          <button class="btn block" data-add="${esc(p.id)}" ${out || inCart >= p.stock ? "disabled" : ""}>
            ${out ? "Agotado" : inCart >= p.stock ? "Máximo en el carrito" : "Agregar al carrito"}
          </button>
        </div>
      </article>`;
    })
    .join("");
}

// ---------- Carrito ----------
function addToCart(id) {
  const p = findProduct(id);
  if (!p) return;
  const item = cart.find((c) => String(c.id) === String(id));
  if ((item?.qty || 0) >= p.stock) return toast("No hay más stock disponible", true);
  if (item) item.qty++;
  else cart.push({ id: p.id, qty: 1 });
  saveCart();
  renderCart();
  renderProducts();
  toast(`${p.name} agregado al carrito`);
}

function changeQty(id, delta) {
  const item = cart.find((c) => String(c.id) === String(id));
  const p = findProduct(id);
  if (!item || !p) return;
  const next = item.qty + delta;
  if (next > p.stock) return toast("No hay más stock disponible", true);
  if (next <= 0) cart = cart.filter((c) => c !== item);
  else item.qty = next;
  saveCart();
  renderCart();
  renderProducts();
}

function removeItem(id) {
  cart = cart.filter((c) => String(c.id) !== String(id));
  saveCart();
  renderCart();
  renderProducts();
}

function cartTotal() {
  return cart.reduce((a, c) => a + (findProduct(c.id)?.price || 0) * c.qty, 0);
}

function renderCart() {
  $("#cartCount").textContent = cart.reduce((a, c) => a + c.qty, 0);
  $("#cartCount").classList.toggle("hidden", cart.length === 0);
  $("#clearCart").classList.toggle("hidden", cart.length === 0);

  if (cart.length === 0) {
    $("#cartItems").innerHTML = `<div class="state"><h3>Tu carrito está vacío</h3><p>Agrega productos del catálogo para empezar.</p></div>`;
    $("#cartTotal").textContent = money(0);
    $("#checkout").disabled = true;
    return;
  }

  $("#cartItems").innerHTML = cart
    .map((c) => {
      const p = findProduct(c.id);
      return `
      <div class="cart-item">
        <img src="${esc(p.image || PLACEHOLDER)}" alt="" />
        <div class="ci-info">
          <strong>${esc(p.name)}</strong>
          <small>${money(p.price)} c/u</small>
          <div class="qty">
            <button data-dec="${esc(c.id)}" aria-label="Quitar una unidad de ${esc(p.name)}">−</button>
            <span>${c.qty}</span>
            <button data-inc="${esc(c.id)}" aria-label="Agregar una unidad de ${esc(p.name)}">+</button>
          </div>
        </div>
        <div class="ci-end">
          <strong>${money(p.price * c.qty)}</strong>
          <button class="link-btn" data-rm="${esc(c.id)}">Quitar</button>
        </div>
      </div>`;
    })
    .join("");
  $("#cartTotal").textContent = money(cartTotal());
  $("#checkout").disabled = false;
}

// ---------- Compra: RESTAR EL STOCK ----------
async function checkout() {
  if (cart.length === 0) return;
  const btn = $("#checkout");
  btn.disabled = true;
  btn.textContent = "Procesando compra…";
  let receipt = null;

  try {
    // 1) Trae el stock actual (por si otra persona compró antes)
    const fresh = await Promise.all(cart.map((c) => API.get("products", c.id)));

    // 2) Valida
    for (let i = 0; i < cart.length; i++) {
      if (!fresh[i] || fresh[i].stock < cart[i].qty) {
        throw new Error(`Stock insuficiente para "${fresh[i]?.name || "un producto"}". Ajusta tu carrito.`);
      }
    }

    // 3) Resta el stock en la API
    await Promise.all(cart.map((c, i) => API.update("products", c.id, { stock: fresh[i].stock - c.qty })));

    receipt = {
      id: "P-" + Date.now().toString().slice(-6),
      date: new Date().toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" }),
      lines: cart.map((c, i) => ({ name: fresh[i].name, qty: c.qty, sub: fresh[i].price * c.qty })),
      total: cart.reduce((a, c, i) => a + fresh[i].price * c.qty, 0),
    };
    cart = [];
    saveCart();
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.textContent = "Confirmar compra";
    await load(); // refresca catálogo con el stock nuevo
    if (receipt) {
      closeCart();
      showReceipt(receipt);
    }
  }
}

function showReceipt(r) {
  $("#receiptMeta").textContent = `Pedido ${r.id} · ${r.date}`;
  $("#receiptBody").innerHTML =
    `<ul class="receipt">` +
    r.lines.map((l) => `<li><span>${l.qty} × ${esc(l.name)}</span><span>${money(l.sub)}</span></li>`).join("") +
    `</ul><div class="total"><span>Total pagado</span><span>${money(r.total)}</span></div>`;
  $("#receiptModal").classList.remove("hidden");
  $("#receiptClose").focus();
}

// ---------- UI ----------
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#overlay").classList.add("open");
  $("#closeCart").focus();
}
function closeCart() {
  $("#drawer").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#overlay").classList.remove("open");
  lastFocus?.focus?.();
}

$("#openCart").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
$("#checkout").addEventListener("click", checkout);
$("#clearCart").addEventListener("click", () => { cart = []; saveCart(); renderCart(); renderProducts(); });
$("#retry").addEventListener("click", load);
$("#receiptClose").addEventListener("click", () => $("#receiptModal").classList.add("hidden"));
$("#clearFilters").addEventListener("click", () => {
  $("#search").value = "";
  $("#categoryFilter").value = "";
  $("#sort").value = "";
  $("#onlyAvailable").checked = false;
  renderProducts();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeCart();
  $("#receiptModal").classList.add("hidden");
});

let searchTimer;
$("#search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderProducts, 150); });
["#categoryFilter", "#sort", "#onlyAvailable"].forEach((s) => $(s).addEventListener("change", renderProducts));

$("#products").addEventListener("click", (e) => {
  const id = e.target.closest("[data-add]")?.dataset.add;
  if (id) addToCart(id);
});
$("#cartItems").addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]")?.dataset.inc;
  const dec = e.target.closest("[data-dec]")?.dataset.dec;
  const rm = e.target.closest("[data-rm]")?.dataset.rm;
  if (inc) changeQty(inc, 1);
  if (dec) changeQty(dec, -1);
  if (rm) removeItem(rm);
});

load();
