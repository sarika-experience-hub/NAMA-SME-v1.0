/*! address.js — Address Details (field layout follows LOS)
 * Onboarding (Screen 4 Step 3) and application (Screen 5 Step 2.4, body[data-mode="application"]).
 * The address returned by the commercial registry is listed first: its returned fields are
 * read-only and it can't be deleted. Other addresses can be added, edited and deleted.
 * Only one address can be the contact address. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var app = document.body.getAttribute("data-mode") === "application";
  var REG_LOCK = ["adType", "adLine1", "adLine1Ar", "adCountry", "adProvince", "adCity", "adZip", "adDistrict", "adStreet", "adBuilding", "adAdditional", "adNational"];
  var G = NAMA.grid({
    card: $("adGridCard"), table: $("adGrid"), modal: $("addrModal"),
    store: "addresses", defaults: NAMA.DEFAULTS.addresses, noun: "address",
    lockedMsg: "Returned by the commercial registry — can't be deleted",
    canDelete: function (r) { return r.src !== "registry"; },
    locked: function (r) { return r.src === "registry" ? REG_LOCK : []; },
    search: function (r) { return [G.text("adType", r.adType), r.adLine1, r.adLine2, G.text("adCity", r.adCity)].join(" "); },
    columns: [
      { label: "Address type", cell: function (r) {
        var tag = r.src === "registry" ? ' <span class="src-tag" title="Returned by the commercial registry">' + NAMA.icon("lock", "ic-sm") + " Registry</span>" : ' <span class="src-tag added">Added by you</span>';
        return '<span class="fw-600">' + NAMA.esc(G.text("adType", r.adType) || "Address") + "</span>" + tag + (r.adNational ? '<div class="small text-3">Saudi National Address</div>' : "");
      } },
      { label: "Address 1", cls: "cell-main", cell: function (r) {
        return NAMA.esc(r.adLine1) + '<div class="small text-3">' + NAMA.esc([r.adLine2, G.text("adCity", r.adCity), r.adZip].filter(Boolean).join(", ")) + "</div>";
      } },
      { label: "Contact address", cell: function (r) { return r.adContact ? '<span class="pill pill-success">' + NAMA.icon("circle-check", "ic-sm") + " Yes</span>" : '<span class="text-3">No</span>'; } }
    ],
    afterSave: function (r, list) {
      // Only one contact address
      if (r.adContact) list.forEach(function (x) { if (x !== r && x.adContact) { x.adContact = false; NAMA.toast("Contact address changed", (G.text("adType", r.adType) || "This address") + " is now the contact address."); } });
      if (!r.src) r.src = "added";
    },
    afterDelete: function (list) {
      if (list.length && !list.some(function (x) { return x.adContact; })) { list[0].adContact = true; NAMA.toast("Contact address changed", "The first address is now the contact address."); }
    },
    savedMsg: function (r) { return (G.text("adType", r.adType) || "The address") + " is in the address list."; }
  });
  ["adZip", "adBuilding", "adAdditional", "adUnit", "adPoBox", "adMobile1", "adMobile2"].forEach(function (id) {
    $(id).addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value); });
  });

  $("adForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var list = G.list(), err = $("adErr");
    if (NAMA.validationOn) {
      if (!list.length) { err.textContent = "Add at least one address to continue."; err.classList.remove("d-none"); return; }
      if (!list.some(function (r) { return r.adContact; })) { err.textContent = "Mark one address as the contact address."; err.classList.remove("d-none"); return; }
    }
    NAMA.go($("adForm").getAttribute("data-next"));
  });
})();
