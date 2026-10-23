/*! identification.js — Identification Details (Screen 4 Step 4, field layout follows LOS)
 * The primary identification (the Corporate ID entered at registration) is filled in
 * automatically and can't be deleted. Other identification records can be added —
 * one per ID type (Unified National Number, Commercial Registration Number, VAT Number).
 * Only one record can be the base (primary) identification. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var corp = NAMA.corp(), prof = NAMA.store.get("corpProfile", NAMA.DEFAULTS.corpProfile);
  var baseType = /commercial/i.test(corp.idType || "") ? "cr" : "unn";
  var defaults = [{ src: "primary", idType: baseType, idNo: corp.idNo, idExpiryG: prof.idExpG || "", idExpiryH: prof.idExpH || "", idBase: true }];
  var G = NAMA.grid({
    card: $("idGridCard"), table: $("idGrid"), modal: $("identModal"),
    store: "ids", defaults: defaults, noun: "identification",
    lockedMsg: "The primary identification can't be deleted",
    canDelete: function (r) { return r.src !== "primary"; },
    locked: function (r) { return r.src === "primary" ? ["idType", "idNo"] : []; },
    search: function (r) { return [G.text("idType", r.idType), r.idNo].join(" "); },
    columns: [
      { label: "ID type", cell: function (r) { return '<span class="fw-600">' + NAMA.esc(G.text("idType", r.idType)) + "</span>" + (r.src === "primary" ? ' <span class="src-tag">' + NAMA.icon("lock", "ic-sm") + " Primary</span>" : ""); } },
      { label: "ID number", cls: "cell-main", cell: function (r) { return '<span class="num">' + NAMA.esc(r.idNo) + "</span>" + (r.idExpiryG ? '<div class="small text-3">Expires ' + NAMA.esc(r.idExpiryG) + "</div>" : ""); } },
      { label: "Is base", cell: function (r) { return r.idBase ? '<span class="pill pill-info">' + NAMA.icon("circle-check", "ic-sm") + " Yes</span>" : '<span class="text-3">No</span>'; } }
    ],
    onOpen: function (r) {
      // Unique by ID type: types already used by other records can't be picked
      var used = G.list().filter(function (x) { return x !== r; }).map(function (x) { return x.idType; });
      Array.prototype.forEach.call($("idType").options, function (o) { if (o.value) { o.disabled = used.indexOf(o.value) >= 0; o.text = o.text.replace(/ \(added\)$/, "") + (o.disabled ? " (added)" : ""); } });
    },
    validate: function () {
      var g = $("idExpiryG").value, p = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(g);
      if (!NAMA.mark($("idExpiryG"), !!p && new Date(+p[3], +p[2] - 1, +p[1]) > new Date())) return $("idExpiryG");
      return null;
    },
    afterSave: function (r, list) {
      if (r.idBase) list.forEach(function (x) { if (x !== r) x.idBase = false; });
      if (!list.some(function (x) { return x.idBase; })) { var p = list.filter(function (x) { return x.src === "primary"; })[0] || list[0]; if (p) p.idBase = true; }
      if (!r.src) r.src = "added";
    },
    afterDelete: function (list) {
      if (list.length && !list.some(function (x) { return x.idBase; })) (list.filter(function (x) { return x.src === "primary"; })[0] || list[0]).idBase = true;
    },
    savedMsg: function (r) { return G.text("idType", r.idType) + " is in the identification list."; }
  });
  $("idNo").addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value).slice(0, 15); });
  $("idForm").addEventListener("submit", function (e) { e.preventDefault(); NAMA.go("onboarding-banking.html"); });
})();
