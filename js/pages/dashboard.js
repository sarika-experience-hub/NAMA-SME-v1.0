/*! dashboard.js — Home & Tracker: fills application / company data from the
 * onboarding session (falls back to demo values when opened directly). */
(function () {
  "use strict";
  // Onboarded but no application yet → Home invites the admin to start one
  var noApp = NAMA.store.get("onboarded", false) && !NAMA.store.get("application", null);
  var app = NAMA.store.get("application", null) || NAMA.DEFAULTS.application;
  var people = NAMA.store.get("people", null);
  var a = NAMA.admin(), c = NAMA.corp();
  var set = function (sel, v) { document.querySelectorAll(sel).forEach(function (el) { el.textContent = v; }); };

  set("[data-app-ref]", app.ref);
  set("[data-app-total]", NAMA.fmt.sar(app.total));
  set("[data-app-products]", app.products.map(function (p) { return p.name.replace(" Card", ""); }).join(" · "));
  set("[data-app-date]", new Date(app.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
  set("[data-admin-first]", a.name.split(/\s+/)[0]);
  set("[data-corp-id]", c.idNo);
  set("[data-admin-mobile]", "+966 " + a.mobile.slice(0, 2) + " " + a.mobile.slice(2, 5) + " " + a.mobile.slice(5));
  set('[data-stat="total"]', NAMA.fmt.sar(app.total));
  set('[data-stat="products"]', app.products.length);
  set('[data-stat="people"]', people ? people.length : 2);
  set('[data-stat="ibans"]', NAMA.store.get("ibans", 1));

  var dp = document.getElementById("dashProducts");
  if (dp) {
    dp.innerHTML = app.products.map(function (p) {
      return '<div class="d-flex justify-content-between align-items-center py-2 border-bottom"><span class="d-flex align-items-center gap-2">' +
        NAMA.icon("credit-card", "text-primary-nama") + NAMA.esc(p.name) + '</span><b class="num">' + NAMA.fmt.sar(p.limit) + "</b></div>";
    }).join("") + '<div class="d-flex justify-content-between pt-2"><span class="text-3">Group limit</span><b class="num text-primary-nama">' + NAMA.fmt.sar(app.total) + "</b></div>";
  }

  if (noApp && document.getElementById("dashAlert")) {
    var al = document.getElementById("dashAlert");
    al.className = "alert-nama alert-success-nama no-close mb-4";
    al.innerHTML = NAMA.icon("circle-check") + '<div class="flex-grow-1"><span class="alert-title">Your SME is onboarded</span>Apply for corporate cards — your verified details are reused, so it only takes a few minutes.</div>' +
      '<a href="application-new.html" class="btn btn-primary btn-sm align-self-center ms-2 text-nowrap">' + NAMA.icon("circle-plus", "ic-sm") + " New Application</a>";
    set('[data-stat="total"]', "—");
    set('[data-stat="products"]', "0");
    var tlApp = document.getElementById("tlApp"), tlCredit = document.getElementById("tlCredit");
    tlApp.className = "active"; tlApp.querySelector(".dot").textContent = "2";
    tlApp.querySelector(".t-title").textContent = "Submit an application";
    tlApp.querySelector(".t-desc").innerHTML = 'Choose a financing product — <a href="application-new.html">start now</a>';
    tlCredit.className = "pending";
    tlCredit.querySelector(".t-desc").textContent = "Usually takes 2–3 business days after submission";
    var st = document.getElementById("dashStatus"); if (st) { st.className = "status status-draft"; st.textContent = "Not started"; }
    if (dp) dp.innerHTML = '<p class="t-sub mb-3">No application yet.</p><a href="application-new.html" class="btn btn-secondary btn-sm">' + NAMA.icon("circle-plus", "ic-sm") + " Start an application</a>";
    var dv = document.getElementById("dashView"); if (dv) dv.classList.add("d-none");
    var tb = document.querySelector('.page-head a[href="tracker.html"]'); if (tb) tb.classList.add("d-none");
  }
  // Application status shown on Home (Application Lifecycle, SME-APP-02 6.2; bell notifications in app.js)
  var status = NAMA.appStatus(), al2 = document.getElementById("dashAlert");

  // Lifecycle card: same stages as the Tracker; the current one shows the customer-facing stage
  var life = document.getElementById("dashLife"), badge = document.getElementById("dashStatus");
  if (!noApp && life && badge) {
    badge.className = "status " + NAMA.APP_BADGE[status];
    badge.textContent = NAMA.APP_STATUS[status];
    var T = [ // title, description when not current
      ["SME onboarding completed", "Business details, key people, addresses, identification, bank accounts and documents captured"],
      [status === "draft" ? "Submit your application" : "Card application submitted", "Products and requested limits sent for assessment"],
      ["Credit assessment", "Usually takes 2–3 business days after submission"],
      ["Offer", "Accept, reject or appeal the approved limits"],
      ["Contract & Promissory Note signing", "Signed by the authorized signatory through Contract.sa, then Nafith (links sent by SMS)"],
      ["Facility granted", "Onboard employees and manage cards"]
    ];
    // status → [current step, failed?, text for the current step]
    var C = {
      draft: [1, false, "Complete your application"], review: [2, false, "We’re assessing your application"],
      appeal: [2, false, "We’re reviewing your appeal"], declined: [2, true, "Assessment complete — the application was declined. You can appeal from the Tracker."],
      offer: [3, false, "Your offer is ready — accept, reject or appeal it"], rejected: [3, true, "You rejected the offer"],
      expired: [3, true, "Your offer is no longer valid"], accepted: [4, false, "Contract and Promissory note are sent to the authorized signatory"],
      granted: [6, false, ""]
    }[status];
    life.innerHTML = T.map(function (t, i) {
      var done = i < C[0] || (status === "granted"), cur = i === C[0];
      var cls = done ? "done" : cur ? (C[1] ? "active failed" : "active") : "pending";
      var dot = done ? NAMA.icon("check") : cur && C[1] ? NAMA.icon("x") : String(i + 1);
      var desc = status === "granted" && i === 5 ? "Your facility is active — onboard employees and manage cards" : cur ? C[2] : t[1];
      return '<li class="' + cls + '"' + (cur ? ' aria-current="step"' : "") + '><span class="dot">' + dot + '</span><div><div class="t-title">' + NAMA.esc(t[0]) + '</div><div class="t-desc">' + NAMA.esc(desc) + "</div></div></li>";
    }).join("");
  }
  if (!noApp && al2 && status !== "review") {
    var ref = '<b class="text-body">' + NAMA.esc(app.ref) + "</b>";
    var A = {
      draft: ["warning", "pencil", "Application not submitted", "Your card application draft is saved. Complete it and submit it for credit assessment.", "Continue Application", "card-application.html"],
      offer: ["success", "circle-check", "Your offer is ready", "Your card application " + ref + " has been approved. View the offer to accept, reject or appeal it.", "View Offer", "tracker.html"],
      declined: ["error", "circle-alert", "Application declined", "Your card application " + ref + " wasn't approved. You can appeal the decision from the Tracker.", "View details", "tracker.html"],
      appeal: ["info", "hourglass", "Appeal under review", "We're reviewing your appeal for card application " + ref + ".", "Track status", "tracker.html"],
      accepted: ["info", "file-text", "Offer accepted", "The contract and then the Promissory Note are sent by SMS to the authorized signatory for signing through Contract.sa and Nafith.", "Track status", "tracker.html"],
      granted: ["success", "circle-check", "Your facility is active", "You can now onboard employees and manage cards for card application " + ref + ".", "View details", "tracker.html"],
      rejected: ["info", "info", "Offer rejected", "You rejected the offer for card application " + ref + ". You can start a new application.", "View details", "tracker.html"],
      expired: ["warning", "clock", "Offer expired", "The offer for card application " + ref + " is no longer valid. You can start a new application.", "View details", "tracker.html"]
    }[status];
    al2.className = "alert-nama alert-" + A[0] + "-nama no-close mb-4";
    al2.innerHTML = NAMA.icon(A[1]) + '<div class="flex-grow-1"><span class="alert-title">' + A[2] + "</span>" + A[3] + '</div><a href="' + A[5] + '" class="btn btn-sm ' + (status === "offer" ? "btn-success" : "btn-secondary") + ' align-self-center ms-2 text-nowrap">' + A[4] + "</a>";
  }
  if (noApp && document.getElementById("appCard")) document.getElementById("appCard").classList.add("d-none");
  set('[data-stat="people"]', (people || NAMA.DEFAULTS.people).length);
  set('[data-stat="ibans"]', NAMA.store.get("ibanList", NAMA.DEFAULTS.ibanList).length);

  var refresh = document.getElementById("refreshBtn");
  if (refresh) refresh.addEventListener("click", function () {
    refresh.disabled = true;
    refresh.innerHTML = '<span class="spinner-border" aria-hidden="true"></span>';
    setTimeout(function () { refresh.disabled = false; refresh.textContent = "Refresh"; NAMA.toast("Status up to date", "No change — your application is still under credit assessment."); }, 900);
  });
})();
