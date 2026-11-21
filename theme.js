// ============================================
// TEMA CLARO / OSCURO (se recuerda en el navegador)
// Se carga en <head> para aplicar el tema antes de pintar la página.
// ============================================
(() => {
  const KEY = "theme";
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const initial = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.setAttribute("data-theme", initial);

  function label() {
    const dark = root.getAttribute("data-theme") === "dark";
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
      btn.title = dark ? "Tema claro" : "Tema oscuro";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    label();
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(KEY, next);
      label();
    });
  });
})();
