/*! documents.js — Document Checklist Upload
 * Onboarding (Screen 4 Step 4) and Cards application documents (Screen 5 Step 2.4,
 * body[data-mode="application"]). Each document has its own label and upload.
 * "Next" enables once all required documents are uploaded, then goes to Review. */
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
      NAMA.go("onboarding-review.html");
    }
  });
})();
