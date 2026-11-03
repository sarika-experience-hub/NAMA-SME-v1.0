/*! documents.js — Document Checklist Upload
 * Onboarding (Screen 4 Step 6) and Cards application documents (Screen 5 Step 2.5,
 * body[data-mode="application"]). Each document has its own label and upload.
 * Onboarding "Next" runs the external validation stage (ZATCA, GOSI; AML by LOS) and then
 * opens Review (SME-ONB-01, 03 Nov). Application "Next" goes straight to Review & Submit. */
(function () {
  "use strict";
  var app = document.body.getAttribute("data-mode") === "application";
  var form = document.getElementById("docsForm"), next = document.getElementById("docsNext");
  var doneEl = document.getElementById("docDone"), prog = document.getElementById("docProgress");
  var required = form.querySelectorAll('[data-upload][data-required="true"]');

  // Application: list everything already provided during onboarding (not requested again)
  var reusedList = document.getElementById("reusedList");
  if (app && reusedList) {
    var prev = NAMA.store.get("docList", NAMA.DEFAULTS.docList).concat(["IBAN certificate"]);
    reusedList.innerHTML = prev.map(function (t) { return "<li>" + NAMA.icon("file-check", "ic-sm") + "<span>" + NAMA.esc(t) + "</span></li>"; }).join("");
    document.getElementById("reusedCount").textContent = prev.length;
  }

  function refresh() {
    var done = Array.prototype.filter.call(required, function (t) { return t.classList.contains("is-done"); }).length;
    doneEl.textContent = done;
    prog.setAttribute("aria-valuenow", done);
    prog.querySelector(".progress-bar").style.width = (done / required.length * 100) + "%";
    next.disabled = NAMA.validationOn ? done < required.length : false;
  }
  form.addEventListener("upload:change", refresh);
  refresh();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (next.disabled) return;
    var uploaded = Array.prototype.map.call(form.querySelectorAll("[data-upload].is-done"), function (t) { return t.getAttribute("data-title"); });
    if (app) {
      NAMA.store.set("cardDocList", uploaded.length ? uploaded : Array.prototype.map.call(required, function (t) { return t.getAttribute("data-title"); }));
      NAMA.go("application-review.html");
    } else {
      var list = uploaded.length ? uploaded : NAMA.DEFAULTS.docList;
      NAMA.store.set("docList", list);
      NAMA.store.set("docs", list.length);
      // External validation stage – ZATCA and GOSI (AML & blacklist screening is done by LOS)
      NAMA.process({
        title: "Verifying Corporate Information",
        text: "We are validating your corporate information with the relevant government and compliance services. Please wait until we complete the required validations.",
        steps: ["VAT registration & tax number", "Employer registration & employee count"]
      }).then(function (ok) { if (ok) NAMA.go("onboarding-review.html"); });
    }
  });
})();
