/*! appnew.js — Screen 5 Step 1: New Application Request
 * Application entry for the Cards financing product (SME-APP-02, 03 Nov: Cards only).
 * The Cards application steps are listed; "Start Cards Application" opens Step 2.1.
 * While an application is pending approval, a new one can't be started
 * (assumption to confirm with PM Lending / NAMA, Q-28).
 * Prototype: ?masterdata=missing → Cards product & fee master data not set up. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("newAppForm"), start = $("startBtn");
  var masterMissing = /[?&]masterdata=missing\b/.test(location.search);
  var pending = NAMA.store.get("application", null);

  function current() { return form.querySelector('input[name="finProduct"]:checked'); }
  function update() {
    var r = current(), key = r.value, name = r.getAttribute("data-name");
    document.querySelectorAll("[data-steps-for]").forEach(function (p) {
      var on = p.getAttribute("data-steps-for") === key;
      p.classList.toggle("d-none", !on);
      if (on) { p.classList.remove("fade-in"); void p.offsetWidth; p.classList.add("fade-in"); }
    });
    $("fpTitle").textContent = name;
    start.innerHTML = "Start " + NAMA.esc(name) + " Application " + NAMA.icon("arrow-right", "ic-sm");
  }
  form.addEventListener("change", update);
  update();

  if (pending) {
    $("appNewNotice").innerHTML = '<div class="alert-nama alert-warning-nama no-close mb-4" role="status">' + NAMA.icon("hourglass") +
      '<div><span class="alert-title">You have an application pending approval</span>Application <b class="text-body">' + NAMA.esc(pending.ref) +
      '</b> is under credit assessment. You can start a new application once a decision is made. <a href="tracker.html">Track status</a></div></div>';
    start.disabled = true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (masterMissing) {
      return NAMA.modal({
        type: "error", title: "Cards product not available",
        text: "The Product & Fee Master Data are not setup.",
        primary: { label: "OK" }
      });
    }
    NAMA.go("card-application.html");
  });
})();
