/*! review.js — Review screens
 * Onboarding (Screen 4 Step 7 – Review Data and Complete Onboarding): consolidates
 *   Business Details, Key People, Addresses, Identification, Banking & IBAN and Documents;
 *   "Complete Onboarding" sends everything to NAMA (LOS) and opens the completion screen.
 *   Prototype: ?los=review → onboarding needs NAMA review before approval.
 * Application (Screen 5 Step 2.6 – Review & Submit, body[data-mode="application"]):
 *   consolidates card products & limits, business details, key people, addresses and
 *   documents; "Submit Application" sends it for credit assessment. A submitted
 *   application is shown read-only (also opened from Tracker → View Application). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var app = document.body.getAttribute("data-mode") === "application";
  var esc = NAMA.esc, icon = NAMA.icon;
  var ROLES = { owner: "Owner", partner: "Partner", ubo: "UBO" };
  var ID_LABEL = { nid: "National ID", iqama: "Iqama", gcc: "GCC ID", passport: "Passport" };
  var CORP_ID = { unn: "Unified National Number", cr: "Commercial Registration Number", vat: "VAT Number" };
  var AD_TYPE = { "head-office": "Head office", branch: "Branch", warehouse: "Warehouse", mailing: "Mailing" };
  function cap(s) { return String(s || "").replace(/(^|-)([a-z])/g, function (m, a, b) { return (a ? " " : "") + b.toUpperCase(); }); }

  var corp = NAMA.corp();
  var prof = NAMA.store.get("corpProfile", NAMA.DEFAULTS.corpProfile);
  var people = NAMA.store.get("people", null);
  if (!people) { // opened directly: show the state after the identity checks
    people = JSON.parse(JSON.stringify(NAMA.DEFAULTS.people));
    people.forEach(function (p, i) { p.yakeen = true; p.idValid = true; p.mobileOk = true; p.kpExpG = ["14/03/2029", "02/11/2030"][i]; if (!p.kpMobile) p.kpMobile = "551112233"; });
  }
  var addresses = NAMA.store.get("addresses", NAMA.DEFAULTS.addresses);
  var ids = NAMA.store.get("ids", [{ src: "primary", idType: "unn", idNo: corp.idNo, idExpiryG: prof.idExpG, idBase: true }]);
  var ibans = NAMA.store.get("ibanList", NAMA.DEFAULTS.ibanList);
  var docs = NAMA.store.get("docList", NAMA.DEFAULTS.docList);
  var submitted = NAMA.store.get("application", null);
  var draft = submitted || NAMA.store.get("appDraft", {
    products: [{ key: "business", name: "Business Card", limit: 400000 }, { key: "procurement", name: "Procurement Card", limit: 250000 }, { key: "travel", name: "Travel Card", limit: 100000 }],
    total: 750000
  });

  function mask(id) { return id && id.length > 4 ? id.slice(0, 2) + "XXXXX" + id.slice(-3) : (id || ""); }
  function kv(items) {
    return '<dl class="rv-grid">' + items.map(function (it) {
      var v = it[3] ? it[1] : it[1] ? esc(it[1]) : '<span class="text-3">—</span>';
      return '<div class="' + (it[2] || "") + '"><dt>' + it[0] + "</dt><dd>" + v + "</dd></div>";
    }).join("") + "</dl>";
  }

  // Business details
  $("rvCorp").innerHTML = kv([
    ["Corporate ID type", corp.idType], ["Corporate ID number", corp.idNo], ["Corporate name", corp.name],
    ["Industry", prof.industry], ["Ownership pattern", prof.ownership], ["Revenue", prof.revenue ? "SAR " + prof.revenue : ""],
    ["Customer segment", prof.segment], ["Number of employees", prof.employees], ["ID expiry date", prof.idExpG ? prof.idExpG + " · " + prof.idExpH + " H" : ""]
  ]);

  // Key people
  var total = Math.round(people.reduce(function (s, p) { return s + (parseFloat(p.kpShare) || 0); }, 0) * 100) / 100;
  $("rvPeople").innerHTML = '<div class="rv-people">' + people.map(function (p) {
    var ok = p.yakeen && p.idValid && p.mobileOk;
    return '<div class="rv-person"><span class="avatar">' + NAMA.initials(p.kpName) + '</span><div class="min-w-0 flex-grow-1">' +
      '<div class="p-name">' + esc(p.kpName) + ' <span class="role-tag">' + (ROLES[p.kpType] || "Key person") + "</span>" + (p.kpSign === "yes" ? ' <span class="role-tag tag-sign">Signatory</span>' : "") + "</div>" +
      '<div class="p-meta">' + (ID_LABEL[p.kpIdType] || "ID") + " " + mask(p.kpIdNo) + (p.kpExpG ? " · ID valid to " + esc(p.kpExpG) : "") + (p.kpMobile ? " · +966 " + esc(p.kpMobile) : "") + "</div></div>" +
      '<div class="rv-share num">' + (p.kpShare ? esc(p.kpShare) + "%" : "—") + "</div>" +
      (ok ? '<span class="status status-completed d-none d-sm-inline-flex">' + icon("check") + " Verified</span>" : '<span class="status status-pending d-none d-sm-inline-flex">Not verified</span>') + "</div>";
  }).join("") + '<div class="rv-person rv-total"><span class="text-3">Total share</span><b class="num ' + (total === 100 ? "text-success-nama" : "") + '">' + total + "%</b></div></div>";

  // Addresses
  if ($("rvAddr")) {
    $("rvAddr").innerHTML = '<div class="d-grid gap-2">' + addresses.map(function (a) {
      return '<div class="rv-iban"><span class="r-ic">' + icon("map-pin", "ic-sm") + '</span><div class="min-w-0 flex-grow-1"><div class="fw-600">' + esc(AD_TYPE[a.adType] || cap(a.adType) || "Address") +
        (a.adContact ? ' <span class="pill pill-success ms-1">' + icon("circle-check", "ic-sm") + " Contact address</span>" : "") + "</div>" +
        '<div class="p-meta">' + esc([a.adLine1, a.adLine2, cap(a.adCity), a.adZip].filter(Boolean).join(", ")) + "</div>" +
        (a.adLine1Ar ? '<div class="p-meta rv-ar" dir="rtl" lang="ar">' + esc([a.adLine1Ar, a.adLine2Ar].filter(Boolean).join("، ")) + "</div>" : "") + "</div></div>";
    }).join("") + "</div>";
  }

  // Identification (onboarding only)
  if ($("rvIds")) {
    $("rvIds").innerHTML = '<div class="rv-people">' + ids.map(function (x) {
      return '<div class="rv-person"><span class="r-ic rv-ic">' + icon("id-card", "ic-sm") + '</span><div class="min-w-0 flex-grow-1"><div class="p-name">' + esc(CORP_ID[x.idType] || x.idType) +
        (x.idBase ? ' <span class="role-tag">Base</span>' : "") + '</div><div class="p-meta num">' + esc(x.idNo) + (x.idExpiryG ? " · expires " + esc(x.idExpiryG) : "") + "</div></div></div>";
    }).join("") + "</div>";
  }

  // Banking (onboarding only)
  if ($("rvBank")) {
    $("rvBank").innerHTML = '<div class="d-grid gap-2">' + ibans.map(function (b, i) {
      return '<div class="rv-iban"><span class="r-ic">' + icon("landmark", "ic-sm") + '</span><div class="min-w-0 flex-grow-1"><div class="fw-600">' + esc(b.bank) +
        (b.primary ? ' <span class="pill pill-info ms-1">' + icon("circle-check", "ic-sm") + " Primary settlement account</span>" : "") + "</div>" +
        '<div class="p-meta num">' + esc(b.iban) + "</div></div>" +
        '<span class="small text-3 text-truncate d-none d-md-inline rv-cert">' + icon("file-check", "ic-sm") + " " + esc(b.cert || "IBAN certificate") + "</span></div>";
    }).join("") + "</div>";
  }

  // Documents
  var docList = app ? NAMA.store.get("cardDocList", ["Card facility application form (signed)", "Board resolution for the card facility", "Bank statements – last 6 months"]) : docs;
  $("rvDocs").innerHTML = '<ul class="rv-docs">' + docList.map(function (t) { return "<li>" + icon("file-check", "ic-sm") + "<span>" + esc(t) + "</span></li>"; }).join("") + "</ul>" +
    (app ? '<p class="small text-3 mt-2 mb-0">' + icon("repeat", "ic-sm") + " Plus " + (docs.length + 1) + " documents reused from your onboarding.</p>" : "");

  // Card products (application only)
  function productRows(list) {
    return list.map(function (p) { return '<div class="rv-prod"><span class="d-flex align-items-center gap-2">' + icon("credit-card", "text-primary-nama") + esc(p.name) + '</span><b class="num">' + NAMA.fmt.sar(p.limit) + "</b></div>"; }).join("");
  }
  if (app) {
    $("rvProducts").innerHTML = productRows(draft.products) + '<div class="rv-prod rv-total"><span class="text-3">Requested group limit</span><b class="num text-primary-nama">' + NAMA.fmt.sar(draft.total) + "</b></div>";
    $("rvTotal").textContent = NAMA.fmt.sar(draft.total);
    $("rvSideList").innerHTML = draft.products.map(function (p) { return '<div class="row-item"><span>' + esc(p.name) + '</span><b class="num">' + NAMA.fmt.sar(p.limit) + "</b></div>"; }).join("");
  } else {
    var verified = people.filter(function (p) { return p.yakeen && p.idValid && p.mobileOk; }).length;
    var checks = [
      [true, "Business details verified"],
      [verified === people.length, people.length + " key people" + (verified === people.length ? " verified" : " (" + verified + " verified)")],
      [addresses.some(function (a) { return a.adContact; }), addresses.length + " address" + (addresses.length === 1 ? "" : "es") + ", contact address set"],
      [ids.length > 0, ids.length + " identification record" + (ids.length === 1 ? "" : "s")],
      [ibans.length > 0, ibans.length + " settlement bank account" + (ibans.length === 1 ? "" : "s")],
      [docs.length > 0, docs.length + " documents uploaded"]
    ];
    $("rvCheck").innerHTML = checks.map(function (c) { return '<li class="' + (c[0] ? "ok" : "warn") + '">' + icon(c[0] ? "circle-check" : "triangle-alert", "ic-sm") + "<span>" + esc(c[1]) + "</span></li>"; }).join("");
  }

  function lock(rec) {
    document.querySelectorAll(".rv-edit, #cancelBtn").forEach(function (el) { el.classList.add("d-none"); });
    $("rvSubmit").classList.add("d-none");
    $("rvNotice").innerHTML = '<div class="alert-nama alert-info-nama no-close mb-4" role="status">' + icon("hourglass") +
      '<div><span class="alert-title">Application pending approval</span>Application <b class="text-body">' + esc(rec.ref) +
      '</b> was submitted on ' + new Date(rec.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      ' and is under credit assessment. <a href="tracker.html">Track status</a></div></div>';
    document.querySelectorAll("[data-app-chip]").forEach(function (el) { el.textContent = rec.ref; });
    document.querySelectorAll(".stepper li").forEach(function (li) { li.classList.add("done"); li.classList.remove("active"); li.removeAttribute("aria-current"); });
  }
  if (app && submitted) lock(submitted);

  $("rvSubmit").addEventListener("click", function () {
    if (!app) {
      NAMA.process({
        title: "Completing your onboarding",
        text: "We're sending your business details, key people, addresses, identification, bank accounts and documents to NAMA.",
        steps: ["Business details", "Key people & addresses", "Identification & bank accounts", "Company documents", "Onboarding approval"]
      }).then(function () {
        if (/[?&]los=review\b/.test(location.search)) {
          return NAMA.modal({
            type: "info", title: "Onboarding submitted for review",
            text: "Your onboarding details were sent to NAMA and need a quick review before approval. We'll notify you by SMS as soon as your SME profile is approved — then you can log in and apply.",
            primary: { label: "OK", href: "login.html" }
          });
        }
        NAMA.go("onboarding-complete.html");
      });
      return;
    }
    var rec = {
      ref: "SME-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 8999)),
      product: "Cards", products: draft.products, total: draft.total, date: new Date().toISOString()
    };
    NAMA.process({
      title: "Submitting your application",
      text: "We're sending your Cards application for credit assessment.",
      steps: ["Card products & requested limits", "Business details, key people & addresses", "Documents", "Submitting for credit assessment"]
    }).then(function () {
      NAMA.store.set("application", rec);
      NAMA.store.set("appStatus", "pending");
      NAMA.store.remove("appDraft");
      lock(rec);
      NAMA.modal({
        type: "success", centered: true, static: true, title: "Application Submitted",
        html: "<p>Your Cards application has been submitted for credit assessment.</p>" +
          '<span class="ref-chip">Application No: ' + esc(rec.ref) + "</span>" +
          '<p class="mb-0">Requested group limit <b class="text-body">' + NAMA.fmt.sar(rec.total) + "</b>. We'll notify you as soon as a decision is available.</p>",
        secondary: { label: "Go to Home", href: "dashboard.html" },
        primary: { label: "Track Application", href: "tracker.html", variant: "btn-success" }
      });
    });
  });
})();
