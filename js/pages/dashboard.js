/*! dashboard.js — Home & Tracker: fills application / company data from the
 * onboarding session (falls back to demo values when opened directly). */
(function () {
  "use strict";
  // Onboarded but no application yet → Home invites the admin to start one
  var noApp = NAMA.store.get("onboarded", false) && !NAMA.store.get("application", null);
  var app = NAMA.store.get("application", {
    ref: "SME-2026-0417", total: 750000, date: new Date().toISOString(),
    products: [{ name: "Business Card", limit: 400000 }, { name: "Procurement Card", limit: 250000 }, { name: "Travel Card", limit: 100000 }]
  });
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
    al.innerHTML = NAMA.icon("circle-check") + '<div class="flex-grow-1"><span class="alert-title">Your SME is onboarded</span>Apply for Cards, Tawarruq, Murabaha or Ijarah financing — your verified details are reused, so it only takes a few minutes.</div>' +
      '<a href="application-new.html" class="btn btn-primary btn-sm align-self-center ms-2 text-nowrap">' + NAMA.icon("circle-plus", "ic-sm") + " New Application</a>";
    set('[data-stat="total"]', "—");
    set('[data-stat="products"]', "0");
    var tlApp = document.getElementById("tlApp"), tlCredit = document.getElementById("tlCredit");
    tlApp.className = "active"; tlApp.querySelector(".dot").textContent = "2";
    tlApp.querySelector(".t-title").textContent = "Submit an application";
    tlApp.querySelector(".t-desc").innerHTML = 'Choose a financing product — <a href="application-new.html">start now</a>';
    tlCredit.className = "pending";
    tlCredit.querySelector(".t-desc").textContent = "Usually takes 2–3 business days after submission";
    var st = document.querySelector(".status.status-progress"); if (st) { st.className = "status status-draft"; st.textContent = "Not started"; }
    if (dp) dp.innerHTML = '<p class="t-sub mb-3">No application yet.</p><a href="application-new.html" class="btn btn-secondary btn-sm">' + NAMA.icon("circle-plus", "ic-sm") + " Start an application</a>";
    var dv = document.getElementById("dashView"); if (dv) dv.classList.add("d-none");
    var tb = document.querySelector('.page-head a[href="tracker.html"]'); if (tb) tb.classList.add("d-none");
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
