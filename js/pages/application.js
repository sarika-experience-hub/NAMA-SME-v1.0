/*! application.js — Screen 5 Step 2.1: Cards Product – Card Products & Requested Limits
 * Select products (retrieved from LOS) and a requested limit for each; the SME
 * group limit is the sum of product limits. "Next" keeps the selection as a draft
 * and continues to Corporate Details (Step 2.2). Once the application has been
 * submitted (Step 2.5) this screen is read-only. */
(function () {
  "use strict";
  var MIN = 10000, MAX = 1000000;
  var form = document.getElementById("appForm");
  var tiles = Array.prototype.slice.call(form.querySelectorAll(".product"));
  var totalEl = document.getElementById("groupTotal"), list = document.getElementById("sumList");
  var selCount = document.getElementById("selCount"), noSel = document.getElementById("noProductErr");

  function val(input) { return Number(NAMA.fmt.digits(input.value)) || 0; }
  function selected() { return tiles.filter(function (t) { return t.classList.contains("is-selected"); }); }

  function summary() {
    var sel = selected(), total = 0;
    selCount.textContent = sel.length;
    if (!sel.length) {
      list.innerHTML = '<p class="empty mb-0">No products selected yet.</p>';
    } else {
      list.innerHTML = sel.map(function (t) {
        var v = val(t.querySelector(".limit-input"));
        total += v;
        return '<div class="row-item"><span>' + NAMA.esc(t.getAttribute("data-name")) + '</span><b class="num">' + (v ? NAMA.fmt.sar(v) : "—") + "</b></div>";
      }).join("");
    }
    totalEl.textContent = NAMA.fmt.sar(total);
    return total;
  }

  function setSelected(tile, on) {
    tile.classList.toggle("is-selected", on);
    NAMA.markDirty();
    tile.querySelector(".p-check").checked = on;
    if (on) { noSel.classList.add("d-none"); setTimeout(function () { tile.querySelector(".limit-input").focus(); }, 30); }
    summary();
  }

  tiles.forEach(function (t) {
    var chk = t.querySelector(".p-check"), lim = t.querySelector(".limit-input");
    t.addEventListener("click", function (e) {
      if (e.target.closest(".p-limit") || e.target === chk) return;
      setSelected(t, !t.classList.contains("is-selected"));
    });
    chk.addEventListener("change", function () { setSelected(t, chk.checked); });
    lim.addEventListener("input", function () {
      var n = val(lim);
      lim.value = n ? NAMA.fmt.num(n) : "";
      if (lim.classList.contains("is-invalid") && n >= MIN && n <= MAX) lim.classList.remove("is-invalid");
      summary();
    });
    lim.addEventListener("blur", function () { if (lim.value) NAMA.mark(lim, val(lim) >= MIN && val(lim) <= MAX); });
  });

  document.getElementById("draftBtn").addEventListener("click", function () {
    NAMA.markClean();
    NAMA.toast("Draft saved", "You can come back and submit your application later.");
  });

  function lockForm(app) {
    document.getElementById("appNotice").innerHTML =
      '<div class="alert-nama alert-info-nama no-close mb-4" role="status">' + NAMA.icon("hourglass") +
      '<div><span class="alert-title">Application pending approval</span>Application <b class="text-body">' + app.ref +
      "</b> is under credit assessment. You can't submit another application until a decision is made. <a href=\"tracker.html\">Track status</a></div></div>";
    app.products.forEach(function (p) {
      var t = form.querySelector('[data-product="' + p.key + '"]');
      if (!t) return;
      t.classList.add("is-selected");
      t.querySelector(".p-check").checked = true;
      t.querySelector(".limit-input").value = NAMA.fmt.num(p.limit);
    });
    form.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
    var nb = document.getElementById("submitBtn");
    nb.outerHTML = '<a href="application-review.html" class="btn btn-primary">View application ' + NAMA.icon("arrow-right", "ic-sm") + "</a>";
    document.getElementById("draftBtn").classList.add("d-none");
    tiles.forEach(function (t) { t.classList.add("is-locked"); });
    summary();
  }

  var existing = NAMA.store.get("application");
  if (existing) { lockForm(existing); return; }

  // Returning to this step: restore the draft selection
  var draft = NAMA.store.get("appDraft", null);
  if (draft) {
    draft.products.forEach(function (p) {
      var t = form.querySelector('[data-product="' + p.key + '"]');
      if (!t) return;
      t.classList.add("is-selected");
      t.querySelector(".p-check").checked = true;
      t.querySelector(".limit-input").value = p.limit ? NAMA.fmt.num(p.limit) : "";
    });
    summary();
  }
  function collect() {
    var sel = selected();
    return { products: sel.map(function (t) { return { key: t.getAttribute("data-product"), name: t.getAttribute("data-name"), limit: val(t.querySelector(".limit-input")) }; }), total: summary() };
  }
  document.getElementById("draftBtn").addEventListener("click", function () { NAMA.store.set("appDraft", collect()); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var sel = selected();
    if (!NAMA.validationOn && !sel.length) { setSelected(tiles[0], true); sel = [tiles[0]]; } // UI review: continue with a sample product
    if (NAMA.validationOn && !sel.length) { noSel.classList.remove("d-none"); noSel.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    var bad = null;
    sel.forEach(function (t) {
      var lim = t.querySelector(".limit-input");
      if (!NAMA.validationOn && !val(lim)) lim.value = NAMA.fmt.num(100000);
      var ok = NAMA.mark(lim, val(lim) >= MIN && val(lim) <= MAX);
      if (!ok && !bad) bad = lim;
    });
    if (bad) { bad.focus(); return; }
    NAMA.store.set("appDraft", collect());
    NAMA.go("application-corporate.html");
  });
})();
