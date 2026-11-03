/*! corporate.js — Business Details (field layout follows LOS)
 * Onboarding (Screen 4 Step 1): registry data is retrieved on screen opening
 * (skeleton while loading); returned fields are read-only, other returned fields
 * are grouped & collapsed, and non-returned mandatory fields are captured.
 * Application (Screen 5 Step 2.2, body[data-mode="application"]): same screen,
 * prefilled with the details verified during onboarding ("confirm or update").
 * "Next" goes straight to Key People Details (SME-ONB-01, 03 Nov). The ZATCA / GOSI
 * validation stage now runs after the Documents step.
 * Application: "Next" skips validation while the reused details are still valid and
 * unchanged. If they have expired (prototype: "Simulate: onboarding data expired" or
 * ?reuse=expired) or the user changed any field, the "Verifying Corporate Information"
 * pop-up (ZATCA / GOSI) runs first. Wathq response validity is
 * centrally configurable (registry data is reused within that window).
 * Add ?registry=fail to preview the retrieval failure. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var app = document.body.getAttribute("data-mode") === "application";
  var loading = $("corpLoading"), error = $("corpError"), form = $("corpForm");
  var fail = !app && /[?&]registry=fail/.test(location.search);
  var FIELDS = ["placeReg", "industry", "ufc", "ownership", "legalForm", "segment", "revenue", "employees"];

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
    if (app) snap = snapshot();
  }

  // Application: reused onboarding data — valid (skip validation) or expired (validate again)
  var snap = null, expired = app && /[?&]reuse=expired/.test(location.search);
  function snapshot() { return FIELDS.map(getVal).join("|"); }
  var note = $("reuseNote"), noteText = $("reuseText"), simBtn = $("simExpired");
  var VALID_HTML = noteText ? noteText.innerHTML : "";
  function setExpired(on) {
    expired = on;
    note.classList.toggle("alert-info-nama", !on);
    note.classList.toggle("alert-warning-nama", on);
    note.querySelector("svg").outerHTML = NAMA.icon(on ? "clock" : "repeat");
    noteText.innerHTML = on
      ? '<span class="alert-title">Your business details need to be validated again</span>The details verified during SME onboarding have expired. Review them, update anything that has changed, then select Next to validate them.'
      : VALID_HTML;
    simBtn.querySelector("span").textContent = on ? "Simulate: onboarding data still valid" : "Simulate: onboarding data expired";
  }
  if (app && note) {
    simBtn.addEventListener("click", function () { setExpired(!expired); });
    if (expired) setExpired(true);
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

  // Revenues: digits only, shown with thousands separators
  function revenueChanged() {
    var el = $("revenue"), n = Number(NAMA.fmt.digits(el.value)) || 0;
    el.value = n ? NAMA.fmt.num(n) : "";
  }
  $("revenue").addEventListener("input", revenueChanged);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = NAMA.validateRequired(form);
    if (bad) { bad.focus(); return; }
    // Save what was entered (UI review mode: empty fields fall back to the demo profile)
    var profile = {};
    FIELDS.forEach(function (id) { profile[id] = getVal(id) || (NAMA.validationOn ? "" : NAMA.DEFAULTS.corpProfile[id]); });
    var changed = app && snapshot() !== snap;
    NAMA.store.set("corpProfile", profile);
    if (!app) { NAMA.go("onboarding-key-people.html"); return; }
    if (!expired && !changed) { NAMA.go("application-key-people.html"); return; }
    // Expired or updated details: external validation stage (ZATCA, GOSI)
    NAMA.process({
      title: "Verifying Corporate Information",
      text: "We are validating your corporate information with the relevant government and compliance services. Please wait until we complete the required validations.",
      steps: ["VAT registration & tax number", "Employer registration & employee count"]
    }).then(function (ok) { if (ok) NAMA.go("application-key-people.html"); });
  });
})();
