/*! corporate.js — Business Details (field layout follows LOS)
 * Onboarding (Screen 4 Step 1): registry data is retrieved on screen opening
 * (skeleton while loading); returned fields are read-only, other returned fields
 * are grouped & collapsed, and non-returned mandatory fields are captured.
 * Application (Screen 5 Step 2.2, body[data-mode="application"]): same screen,
 * prefilled with the details verified during onboarding ("confirm or update").
 * "Next" runs the tax (ZATCA) and employer (GOSI) validations. AML screening is
 * done by LOS, not here. Registry data is valid for 14 days (reused within that window).
 * Add ?registry=fail to preview the retrieval failure. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var app = document.body.getAttribute("data-mode") === "application";
  var loading = $("corpLoading"), error = $("corpError"), form = $("corpForm");
  var fail = !app && /[?&]registry=fail/.test(location.search);
  var FIELDS = ["industry", "ownership", "revenue", "segment", "employees", "referral", "idExpG", "idExpH"];

  // Personalise read-only registry values with what the admin entered at registration
  var corp = NAMA.corp();
  var roId = $("ro_corporateidnumber"), roName = $("ro_corporatename"), roType = $("ro_corporateidtype");
  if (roType && corp.idType) roType.value = corp.idType;
  if (roId) roId.value = corp.idNo;
  if (roName) roName.value = corp.name;

  // Select values are stored as their visible text so Review can show them as entered
  function setVal(id, v) {
    var el = $(id);
    if (!el || v == null || v === "") return;
    if (el.tagName === "SELECT") {
      var o = Array.prototype.find.call(el.options, function (x) { return x.text === v || x.value === v; });
      if (o) el.value = o.value;
    } else el.value = v;
  }
  function getVal(id) {
    var el = $(id);
    if (el.tagName === "SELECT") return el.value ? el.selectedOptions[0].text : "";
    return el.value.trim();
  }
  function prefill() {
    var saved = NAMA.store.get("corpProfile", null);
    var src = saved || (app ? NAMA.DEFAULTS.corpProfile : null);
    if (src) FIELDS.forEach(function (id) { setVal(id, src[id]); });
    revenueChanged();
  }

  function load() {
    loading.classList.remove("d-none");
    error.classList.add("d-none");
    form.classList.add("d-none");
    setTimeout(function () {
      loading.classList.add("d-none");
      if (fail) { error.classList.remove("d-none"); fail = false; return; }
      form.classList.remove("d-none");
      form.classList.add("fade-in");
      prefill();
    }, 1400);
  }
  $("retryBtn").addEventListener("click", load);
  if (app) prefill(); else load();

  // Revenue → customer segment (read-only)
  var expiry = NAMA.datePair($("idExpG"), $("idExpH"));
  function revenueChanged() {
    var el = $("revenue"), n = Number(NAMA.fmt.digits(el.value)) || 0;
    el.value = n ? NAMA.fmt.num(n) : "";
    $("segment").value = !n ? "" : n <= 3000000 ? "Micro" : n <= 40000000 ? "Small" : n <= 200000000 ? "Medium" : "Large";
  }
  $("revenue").addEventListener("input", revenueChanged);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = NAMA.validateRequired(form);
    var exp = expiry.date();
    var expOk = NAMA.mark($("idExpG"), expiry.valid() && exp > new Date());
    if (!expOk && !bad) { bad = $("idExpG"); bad.focus(); }
    if (bad) return;
    // Save what was entered (UI review mode: empty fields fall back to the demo profile)
    var profile = {};
    FIELDS.forEach(function (id) { profile[id] = getVal(id) || NAMA.DEFAULTS.corpProfile[id]; });
    NAMA.store.set("corpProfile", profile);
    NAMA.process({
      title: "Verifying Corporate Information",
      text: "We are validating your corporate information with the relevant government and compliance services. Please wait until we complete the required validations.",
      steps: ["VAT registration & tax number", "Employer registration & employee count"]
    }).then(function (ok) {
      if (ok) NAMA.go(app ? "application-key-people.html" : "onboarding-key-people.html");
    });
  });
})();
