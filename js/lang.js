/*! lang.js — layout direction switch: English (left to right) ⇄ Arabic (right to left).
 * Loaded in <head> right after the stylesheets, so a saved RTL choice swaps in the RTL
 * stylesheets (link[data-rtl]) before the first paint — no flash of the LTR layout.
 * The choice is remembered for this browser (localStorage "nama.dir").
 * Text stays English for now; the Arabic copy (docs/SME/NAMA_SME_Arabic_UI_Text_Draft.xlsx)
 * will be switched on once it is approved.
 *
 * Toggles: any [data-lang-toggle] button (auth pages, top bar) and the
 * input[data-lang-radio] options on Settings. API: NAMA_LANG.get() / .set("rtl"|"ltr").
 * Preview a direction once with ?dir=rtl or ?dir=ltr. */
(function () {
  "use strict";
  var KEY = "nama.dir", root = document.documentElement;

  function saved() { try { return localStorage.getItem(KEY) === "rtl" ? "rtl" : "ltr"; } catch (e) { return "ltr"; } }
  function save(d) { try { localStorage.setItem(KEY, d); } catch (e) { /* private mode: this page only */ } }
  function links() { return Array.prototype.slice.call(document.querySelectorAll("link[data-rtl]")); }
  function hrefFor(l, d) {
    if (!l.hasAttribute("data-ltr")) l.setAttribute("data-ltr", l.getAttribute("href"));
    return l.getAttribute(d === "rtl" ? "data-rtl" : "data-ltr");
  }

  // First load (still in <head>): swap hrefs in place — the parser-created links stay render-blocking.
  var q = /[?&]dir=(rtl|ltr)\b/.exec(location.search);
  var dir = q ? q[1] : saved();
  if (q) save(dir);
  links().forEach(function (l) { var h = hrefFor(l, dir); if (l.getAttribute("href") !== h) l.setAttribute("href", h); });
  root.setAttribute("dir", dir);

  // Live switch: load the other set of stylesheets off-screen, then swap everything in one go.
  function apply(d, done) {
    var old = links(), pending = old.length, fresh = [];
    if (!pending) { root.setAttribute("dir", d); return done && done(); }
    old.forEach(function (l) {
      var n = l.cloneNode();
      n.setAttribute("href", hrefFor(l, d));
      n.setAttribute("data-ltr", l.getAttribute("data-ltr"));
      n.media = "not all";
      n.onload = n.onerror = function () {
        if (--pending) return;
        fresh.forEach(function (x) { x.media = "all"; });
        old.forEach(function (x) { x.remove(); });
        root.setAttribute("dir", d);
        if (done) done();
      };
      fresh.push(n);
      l.after(n);
    });
  }

  function labels() {
    var rtl = dir === "rtl";
    document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", rtl ? "Switch to English layout (left to right)" : "Switch to Arabic layout (right to left)");
      var s = b.querySelector("[data-lang-label]");
      if (s) { s.textContent = rtl ? "English" : "العربية"; s.setAttribute("lang", rtl ? "en" : "ar"); }
    });
    document.querySelectorAll("input[data-lang-radio]").forEach(function (r) { r.checked = r.value === dir; });
  }

  function set(d) {
    d = d === "rtl" ? "rtl" : "ltr";
    if (d === dir) return labels();
    dir = d;
    save(d);
    apply(d, function () {
      labels();
      if (window.NAMA && NAMA.toast) {
        NAMA.toast(d === "rtl" ? "Layout switched to right to left" : "Layout switched to left to right");
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-lang-toggle]")) set(dir === "rtl" ? "ltr" : "rtl");
  });
  document.addEventListener("change", function (e) {
    if (e.target.matches("input[data-lang-radio]")) set(e.target.value);
  });
  document.addEventListener("DOMContentLoaded", labels);

  window.NAMA_LANG = { get: function () { return dir; }, set: set };
})();
