/*!
 * app.js — shared behaviour for the NAMA SME Cards portal.
 * Depends on js/vendor/bootstrap.bundle.min.js (Modal, Offcanvas, Collapse, Dropdown, Toast).
 * Exposes window.NAMA with: store, fmt, modal(), process(), toast(), initials().
 */
(function () {
  "use strict";

  /* =====================================================================
   * VALIDATION SWITCH
   * false = UI review mode: field validations are hidden and every step can
   *         be clicked through without filling in the forms.
   * true  = all field validations are active.
   * For a quick check without editing this file, open any page with
   * ?validate=on (or ?validate=off) — the choice is kept for the session.
   * ===================================================================== */
  var VALIDATION_ENABLED = false;

  /* ---------- Session store (prototype state across pages) ---------- */
  var PREFIX = "nama.";
  var store = {
    get: function (k, fallback) {
      try { var v = sessionStorage.getItem(PREFIX + k); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set: function (k, v) { try { sessionStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    remove: function (k) { try { sessionStorage.removeItem(PREFIX + k); } catch (e) { /* noop */ } },
    clear: function () {
      try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf(PREFIX) === 0) sessionStorage.removeItem(k); }); } catch (e) { /* noop */ }
    }
  };

  /* Demo defaults so every screen renders meaningfully on its own */
  var DEFAULTS = {
    admin: { name: "Faisal Al-Qahtani", username: "faisal.qahtani", mobile: "501234567", email: "faisal@alnoortrading.sa" },
    corp: { idType: "Unified National Number", idNo: "7009139175", name: "Al Noor Trading Company", nameAr: "شركة النور التجارية" },
    // Captured on Business Details (non-registry fields) — used by Review and the application journey
    corpProfile: { industry: "Wholesale & retail trade", ownership: "Limited Liability Company", revenue: "12,500,000", segment: "Small",
      employees: "6 – 49", referral: "", idExpG: "13/10/2027", idExpH: "13/05/1449" },
    // Key people returned by the commercial registry (can't be deleted; returned fields read-only)
    people: [
      { src: "registry", kpType: "owner", kpBasedOn: "individual", kpName: "Abdulrahman Saad Al-Otaibi", kpFirst: "Abdulrahman", kpMiddle: "Saad", kpFamily: "Al-Otaibi",
        kpFirstAr: "عبدالرحمن", kpMiddleAr: "سعد", kpFamilyAr: "العتيبي", kpIdType: "nid", kpIdNo: "1023456789", kpDobG: "14/03/1978", kpDobH: "05/04/1398",
        kpShare: "60", kpMobile: "505551234", kpSign: "yes", kpContract: "yes", kpExec: "yes", kpPosition: "General Manager" },
      { src: "registry", kpType: "partner", kpBasedOn: "individual", kpName: "Sara Khalid Al-Mutairi", kpFirst: "Sara", kpMiddle: "Khalid", kpFamily: "Al-Mutairi",
        kpFirstAr: "سارة", kpMiddleAr: "خالد", kpFamilyAr: "المطيري", kpIdType: "nid", kpIdNo: "1098765432", kpDobG: "02/11/1985", kpDobH: "18/02/1406",
        kpShare: "40", kpMobile: "", kpSign: "no", kpContract: "no", kpExec: "no", kpPosition: "Partner" }
    ],
    // Address returned by the commercial registry (can't be deleted)
    addresses: [
      { src: "registry", adType: "head-office", adStatus: "active", adLine1: "7421 King Fahd Road", adLine2: "Al Olaya District, Unit 12",
        adLine1Ar: "٧٤٢١ طريق الملك فهد", adLine2Ar: "حي العليا، وحدة ١٢", adCountry: "sa", adProvince: "riyadh", adCity: "riyadh", adZip: "12211",
        adDistrict: "Al Olaya", adStreet: "King Fahd Road", adBuilding: "7421", adAdditional: "3344", adUnit: "12", adPoBox: "55123",
        adNational: true, adContact: true, adMobile1: "501234567", adEmail: "info@alnoortrading.sa" }
    ],
    ibanList: [{ iban: "SA03 8000 0000 6080 1016 7519", bank: "Al Rajhi Bank", primary: true, cert: "IBAN_letter_AlRajhi.pdf" }],
    docList: ["Commercial Registration (CR) certificate", "Articles of Association", "VAT registration certificate", "National address certificate", "Admin authorization letter"]
  };
  function admin() { return store.get("admin", DEFAULTS.admin); }

  var vParam = /[?&]validate=(on|off)\b/.exec(location.search);
  if (vParam) store.set("validate", vParam[1] === "on");
  var validationOn = store.get("validate", VALIDATION_ENABLED);
  // Campaign context (e.g. index.html?campaign=cards) is kept so the admin lands on that product after onboarding
  var cParam = /[?&]campaign=([a-z]+)\b/.exec(location.search);
  if (cParam) store.set("campaign", cParam[1]);
  function corp() { return store.get("corp", DEFAULTS.corp); }

  /* ---------- Formatting ---------- */
  var fmt = {
    sar: function (n) { return Number(n || 0).toLocaleString("en-US") + " SAR"; },
    num: function (n) { return Number(n || 0).toLocaleString("en-US"); },
    digits: function (s) { return String(s || "").replace(/\D+/g, ""); }
  };
  function initials(name) {
    return String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase() || "NA";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function icon(name, cls) { return '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  /* ---------- Result modals (Information / Success / Error / Warning) ---------- */
  var ICONS = { info: "info", success: "circle-check", error: "circle-alert", warning: "triangle-alert" };
  function modal(opts) {
    opts = opts || {};
    var type = opts.type || "info";
    var id = "namaModal" + Date.now();
    var btn = function (b, fallbackVariant) {
      if (!b) return "";
      return '<button type="button" class="btn ' + (b.variant || fallbackVariant) + '" data-act="' + (b === opts.primary ? "primary" : "secondary") + '">' + esc(b.label) + "</button>";
    };
    var primaryVariant = { info: "btn-primary", success: "btn-success", error: "btn-danger", warning: "btn-primary" }[type];
    var html =
      '<div class="modal fade modal-' + type + '" id="' + id + '" tabindex="-1" aria-labelledby="' + id + 'T" aria-hidden="true"' + (opts.static ? ' data-bs-backdrop="static" data-bs-keyboard="false"' : "") + ">" +
      '<div class="modal-dialog modal-dialog-centered modal-nama"><div class="modal-content">' +
      '<div class="m-head">' + (opts.centered ? "" : '<span class="m-icon m-icon-sm ' + type + ' m-0">' + icon(ICONS[type]) + "</span>") +
      '<h2 class="m-title" id="' + id + 'T">' + esc(opts.title) + "</h2>" +
      (opts.static ? "" : '<button type="button" class="m-close" data-bs-dismiss="modal" aria-label="Close">' + icon("circle-x", "ic-lg") + "</button>") + "</div>" +
      '<div class="m-body' + (opts.centered ? " m-center" : "") + '">' +
      (opts.centered ? '<div class="m-icon ' + type + '">' + icon(ICONS[type]) + "</div>" : "") +
      (opts.html || "<p class=\"mb-0\">" + esc(opts.text) + "</p>") + "</div>" +
      '<div class="m-foot">' + btn(opts.secondary, "btn-soft") + btn(opts.primary || { label: "OK" }, primaryVariant) + "</div>" +
      "</div></div></div>";
    document.body.insertAdjacentHTML("beforeend", html);
    var el = document.getElementById(id);
    // Stacked on top of another open modal (e.g. the Add Key Person form)
    if (document.querySelector(".modal.show")) {
      el.classList.add("stacked");
      el.addEventListener("shown.bs.modal", function () {
        var bds = document.querySelectorAll(".modal-backdrop");
        if (bds.length) bds[bds.length - 1].classList.add("stacked");
      }, { once: true });
    }
    var m = bootstrap.Modal.getOrCreateInstance(el);
    var chosen = null;
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      chosen = b.getAttribute("data-act");
      m.hide();
    });
    el.addEventListener("hidden.bs.modal", function () {
      var cfg = chosen === "primary" ? (opts.primary || {}) : chosen === "secondary" ? opts.secondary : null;
      el.remove();
      if (cfg && cfg.href) go(cfg.href);
      if (cfg && typeof cfg.onClick === "function") cfg.onClick();
      if (!cfg && typeof opts.onDismiss === "function") opts.onDismiss();
    });
    m.show();
    return m;
  }

  /* ---------- Processing modal with validation checklist ---------- */
  function process(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var id = "namaProc" + Date.now();
      var steps = opts.steps || [];
      var html =
        '<div class="modal fade" id="' + id + '" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false" aria-labelledby="' + id + 'T" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered modal-nama"><div class="modal-content">' +
        '<div class="m-body m-center pt-4 pb-4" role="status" aria-live="polite">' +
        '<div class="proc-spin" aria-hidden="true"></div>' +
        '<h2 class="m-title mb-2" id="' + id + 'T">' + esc(opts.title || "Processing") + "</h2>" +
        '<p class="mb-0">' + esc(opts.text || "Processing your request…") + "</p>" +
        (steps.length ? '<ul class="proc-list">' + steps.map(function (s) { return '<li><span class="st"></span><span>' + esc(s) + "</span></li>"; }).join("") + "</ul>" : "") +
        "</div></div></div></div>";
      document.body.insertAdjacentHTML("beforeend", html);
      var el = document.getElementById(id);
      var m = bootstrap.Modal.getOrCreateInstance(el);
      var items = el.querySelectorAll(".proc-list li");
      var failAt = typeof opts.failAt === "number" ? opts.failAt : -1;
      var i = 0;
      function finish(ok) {
        setTimeout(function () {
          el.addEventListener("hidden.bs.modal", function () { el.remove(); resolve(ok); }, { once: true });
          m.hide();
        }, ok ? 450 : 700);
      }
      function next() {
        if (i > 0) {
          var prev = items[i - 1];
          prev.classList.remove("run");
          if (i - 1 === failAt) {
            prev.classList.add("fail");
            prev.querySelector(".st").innerHTML = icon("x");
            return finish(false);
          }
          prev.classList.add("ok");
          prev.querySelector(".st").innerHTML = icon("check");
        }
        if (i >= items.length) return finish(true);
        items[i].classList.add("run");
        i++;
        setTimeout(next, 700 + Math.random() * 450);
      }
      el.addEventListener("shown.bs.modal", function () { if (items.length) setTimeout(next, 300); else setTimeout(function () { finish(failAt < 0); }, opts.duration || 1400); }, { once: true });
      m.show();
    });
  }

  /* ---------- Toast ---------- */
  function toast(title, text, type) {
    var c = document.querySelector(".toast-container");
    if (!c) {
      c = document.createElement("div");
      c.className = "toast-container position-fixed top-0 end-0 p-3";
      document.body.appendChild(c);
    }
    var el = document.createElement("div");
    el.className = "toast toast-nama border-0 " + (type === "error" ? "error" : "");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = icon(type === "error" ? "circle-alert" : "circle-check") + "<div><b>" + esc(title) + "</b>" + esc(text || "") + "</div>";
    c.appendChild(el);
    var t = bootstrap.Toast.getOrCreateInstance(el, { delay: 4000 });
    el.addEventListener("hidden.bs.toast", function () { el.remove(); });
    t.show();
  }

  /* ---------- Global wiring ---------- */
  document.addEventListener("click", function (e) {
    // Show / hide password
    var tp = e.target.closest("[data-toggle-password]");
    if (tp) {
      var input = document.getElementById(tp.getAttribute("data-toggle-password"));
      if (input) {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        tp.setAttribute("aria-label", show ? "Hide password" : "Show password");
        tp.setAttribute("aria-pressed", show ? "true" : "false");
        tp.querySelector("use").setAttribute("href", show ? "#i-eye-off" : "#i-eye");
      }
    }
    // Dismissible alert banners
    var ac = e.target.closest("[data-dismiss-alert]");
    if (ac) { var a = ac.closest(".alert-nama"); if (a) a.remove(); }
    // Locked navigation (profile limited until corporate onboarding completes)
    var locked = e.target.closest(".side-link.is-locked");
    if (locked) {
      e.preventDefault();
      toast("Complete onboarding first", "This section unlocks once your SME onboarding is complete.", "error");
    }
    // Logout (only reached when the unsaved-changes guard didn't intercept)
    var lo = e.target.closest("[data-logout]");
    if (lo && !e.defaultPrevented) { store.remove("session"); }
  });

  /* Sidebar: active page, locked items, user identity */
  function initShell() {
    var page = document.body.getAttribute("data-page");
    var onboarded = store.get("onboarded", false) || document.body.hasAttribute("data-demo-onboarded");
    document.querySelectorAll(".side-link[data-nav]").forEach(function (l) {
      if (l.getAttribute("data-nav") === page) { l.classList.add("active"); l.setAttribute("aria-current", "page"); }
      if (l.hasAttribute("data-requires-onboarding") && !onboarded) {
        l.classList.add("is-locked");
        l.setAttribute("aria-disabled", "true");
        l.insertAdjacentHTML("beforeend", icon("lock", "lock"));
      }
    });
    var a = admin();
    document.querySelectorAll("[data-admin-name]").forEach(function (el) { el.textContent = a.name; });
    document.querySelectorAll("[data-admin-initials]").forEach(function (el) { el.textContent = initials(a.name); });
    document.querySelectorAll("[data-corp-name]").forEach(function (el) { el.textContent = corp().name; });
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
    // Last login: time of the previous successful login (falls back to now for direct page opens)
    var last = new Date(store.get("lastLogin", now.toISOString()));
    var sameDay = last.toDateString() === now.toDateString();
    var lhh = String(last.getHours()).padStart(2, "0"), lmm = String(last.getMinutes()).padStart(2, "0");
    var when = (sameDay ? "Today" : last.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })) + ", " + lhh + ":" + lmm;
    document.querySelectorAll("[data-last-login]").forEach(function (el) { el.textContent = "Last login: " + when; });
    document.querySelectorAll("[data-last-login-time]").forEach(function (el) { el.textContent = when; });
    var ua = navigator.userAgent;
    var browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    var os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "your device";
    document.querySelectorAll("[data-last-login-device]").forEach(function (el) { el.textContent = browser + " on " + os; });
    // Application reference chip on the Cards application steps
    var appRec = store.get("application", null);
    document.querySelectorAll("[data-app-chip]").forEach(function (el) { el.textContent = appRec ? appRec.ref : "Draft application"; });
    if (!validationOn) document.querySelectorAll(".v-only").forEach(function (el) { el.classList.add("d-none"); });
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = now.getFullYear(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initShell); else initShell();

  /* ---------- In-portal notifications (header bell) ----------
   * Built from the prototype state: onboarding completion, application submitted and the
   * credit decision (approved / declined → in-portal notification, SME-APP-BR-12). */
  function notifications() {
    var list = [], onboarded = store.get("onboarded", false) || document.body.hasAttribute("data-demo-onboarded");
    var app = store.get("application", null) || (document.body.hasAttribute("data-demo-onboarded") ? { ref: "SME-2026-0417", date: new Date(Date.now() - 2 * 864e5).toISOString() } : null);
    var status = store.get("appStatus", "pending");
    if (app && status === "approved") list.push({ id: "approved-" + app.ref, icon: "circle-check", tone: "ok", title: "Application approved", text: "Your Cards application " + app.ref + " has been approved. Review your offer to continue.", href: "tracker.html", when: "Just now" });
    if (app && status === "declined") list.push({ id: "declined-" + app.ref, icon: "circle-alert", tone: "bad", title: "Application declined", text: "Your Cards application " + app.ref + " was not approved. See the Tracker for details.", href: "tracker.html", when: "Just now" });
    if (app && status !== "draft") list.push({ id: "submitted-" + app.ref, icon: "hourglass", tone: "info", title: "Application submitted", text: "Application " + app.ref + " is under credit assessment.", href: "tracker.html", when: new Date(app.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) });
    if (onboarded) list.push({ id: "onboarded", icon: "building", tone: "ok", title: "SME onboarding complete", text: "Your SME profile is ready. You can apply for financing.", href: "application-new.html", when: "Earlier" });
    return list;
  }
  function initNotifications() {
    var box = document.querySelector("[data-notif-list]");
    if (!box) return;
    var countEl = document.querySelector("[data-notif-count]"), bell = document.getElementById("bellBtn");
    function render() {
      var read = store.get("notifRead", []), list = notifications();
      var unread = list.filter(function (n) { return read.indexOf(n.id) < 0; }).length;
      box.innerHTML = list.length ? list.map(function (n) {
        var isNew = read.indexOf(n.id) < 0;
        return '<a class="nm-item' + (isNew ? " is-new" : "") + '" href="' + n.href + '" data-notif-id="' + esc(n.id) + '"><span class="nm-ic ' + n.tone + '">' + icon(n.icon, "ic-sm") + '</span><span class="nm-main"><b>' + esc(n.title) + "</b><span>" + esc(n.text) + '</span><small>' + esc(n.when) + "</small></span></a>";
      }).join("") : '<p class="nm-empty">No notifications yet.</p>';
      countEl.textContent = unread;
      countEl.classList.toggle("d-none", !unread);
      bell.setAttribute("aria-label", "Notifications" + (unread ? ", " + unread + " unread" : ""));
    }
    box.addEventListener("click", function (e) {
      var a = e.target.closest("[data-notif-id]"); if (!a) return;
      var read = store.get("notifRead", []); if (read.indexOf(a.getAttribute("data-notif-id")) < 0) { read.push(a.getAttribute("data-notif-id")); store.set("notifRead", read); }
    });
    document.querySelector("[data-notif-readall]").addEventListener("click", function () {
      store.set("notifRead", notifications().map(function (n) { return n.id; })); render();
    });
    document.addEventListener("nama:notifications", render);
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNotifications); else initNotifications();

  /* ---------- Unsaved-changes guard ----------
   * Forms marked [data-guard] become "dirty" as soon as the user types, picks an
   * option or uploads a file. Leaving the page through any link (side menu, logo,
   * header menu, Cancel, Back, progress steps) then asks for confirmation, and the
   * browser asks too on refresh / tab close. Intentional navigation after a
   * successful step uses NAMA.go(url), which clears the guard first. */
  var guard = { dirty: false };
  function markDirty() { guard.dirty = true; }
  function markClean() { guard.dirty = false; }
  function go(url) { guard.dirty = false; window.location.href = url; }
  function confirmLeave(onLeave) {
    modal({
      type: "warning", title: "Leave without saving?",
      text: "You have unsaved changes on this page. If you leave now, the information you entered will be lost.",
      secondary: { label: "Stay on this page" },
      primary: { label: "Leave page", variant: "btn-danger", onClick: onLeave }
    });
  }
  function leave(url, isLogout) {
    var doIt = function () { if (isLogout) store.remove("session"); go(url); };
    if (guard.dirty) confirmLeave(doIt); else doIt();
  }
  ["input", "change", "upload:change"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (e.target && e.target.closest && e.target.closest("form[data-guard]")) guard.dirty = true;
    }, true);
  });
  document.addEventListener("click", function (e) {
    if (!guard.dirty) return;
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("data-no-guard") ||
        a.classList.contains("is-locked") || /^(tel|mailto):/i.test(href)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    leave(href, a.hasAttribute("data-logout"));
  }, true);
  window.addEventListener("beforeunload", function (e) {
    if (guard.dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Session timeout (logged-in pages only) ----------
   * After SESSION.idle seconds without activity the admin is logged out. A
   * countdown pop-up appears SESSION.warn seconds before that with
   * "Stay signed in" / "Log out now". Activity = mouse, keyboard, touch, scroll.
   * Demo: open any logged-in page with ?session=demo to see the warning after
   * 20 seconds of inactivity (?session=normal switches back). */
  var SESSION = { idle: 15 * 60, warn: 2 * 60 };
  var sParam = /[?&]session=(demo|normal)\b/.exec(location.search);
  if (sParam) store.set("sessionDemo", sParam[1] === "demo");
  if (store.get("sessionDemo", false)) SESSION = { idle: 140, warn: 120 };

  function initSessionTimeout() {
    if (!document.querySelector(".app")) return; // only inside the authenticated shell
    var lastActive = Date.now(), warnEl = null, warnModal = null, tick = null, deadline = 0;
    var R = 42, C = 2 * Math.PI * R;

    function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); }

    function expire() {
      clearInterval(tick);
      guard.dirty = false;
      store.remove("session");
      store.set("sessionExpired", Math.round(SESSION.idle / 60));
      window.location.href = "login.html";
    }
    function logoutNow() {
      clearInterval(tick);
      guard.dirty = false;
      store.remove("session");
      window.location.href = "login.html";
    }
    function stay() {
      clearInterval(tick);
      lastActive = Date.now();
      if (warnModal) warnModal.hide();
      toast("Session extended", "You're still signed in.");
    }
    function render() {
      var left = (deadline - Date.now()) / 1000;
      if (left <= 0) return expire();
      warnEl.querySelector(".st-time").textContent = mmss(left);
      warnEl.querySelector(".st-ring-fg").style.strokeDashoffset = String(C * (1 - left / SESSION.warn));
      warnEl.classList.toggle("is-urgent", left <= 30);
      var sr = warnEl.querySelector(".st-sr"), bucket = Math.ceil(left / 30) * 30;
      if (sr.getAttribute("data-b") !== String(bucket)) { sr.setAttribute("data-b", bucket); sr.textContent = "You will be logged out in " + mmss(left).replace(":", " minutes ") + " seconds."; }
    }
    function showWarning() {
      if (warnEl) return;
      deadline = lastActive + SESSION.idle * 1000;
      var html =
        '<div class="modal fade modal-session" id="sessionModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false" aria-labelledby="sessionTitle" aria-describedby="sessionDesc" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered modal-nama"><div class="modal-content">' +
        '<div class="m-body m-center pt-4">' +
        '<div class="st-ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="st-ring-bg" cx="50" cy="50" r="' + R + '"/>' +
        '<circle class="st-ring-fg" cx="50" cy="50" r="' + R + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="0"/></svg>' +
        '<span class="st-time num">' + mmss(SESSION.warn) + "</span></div>" +
        '<h2 class="m-title mb-2" id="sessionTitle">Your session is about to expire</h2>' +
        '<p class="mb-0" id="sessionDesc">For your security, you will be logged out automatically after ' + Math.round(SESSION.idle / 60) + " minutes of inactivity.</p>" +
        (guard.dirty ? '<p class="st-unsaved mb-0 mt-2">' + icon("triangle-alert", "ic-sm") + " Unsaved changes on this page will be lost.</p>" : "") +
        '<span class="visually-hidden st-sr" aria-live="polite"></span>' +
        "</div>" +
        '<div class="m-foot"><button type="button" class="btn btn-soft" data-st="logout">Log out now</button>' +
        '<button type="button" class="btn btn-primary" data-st="stay">Stay signed in</button></div>' +
        "</div></div></div>";
      document.body.insertAdjacentHTML("beforeend", html);
      warnEl = document.getElementById("sessionModal");
      if (document.querySelector(".modal.show")) {
        warnEl.classList.add("stacked");
        warnEl.addEventListener("shown.bs.modal", function () { var b = document.querySelectorAll(".modal-backdrop"); if (b.length) b[b.length - 1].classList.add("stacked"); }, { once: true });
      }
      warnModal = bootstrap.Modal.getOrCreateInstance(warnEl);
      warnEl.addEventListener("click", function (e) {
        var b = e.target.closest("[data-st]");
        if (!b) return;
        if (b.getAttribute("data-st") === "stay") stay(); else logoutNow();
      });
      warnEl.addEventListener("shown.bs.modal", function () { warnEl.querySelector('[data-st="stay"]').focus(); });
      warnEl.addEventListener("hidden.bs.modal", function () { warnEl.remove(); warnEl = null; warnModal = null; });
      render();
      tick = setInterval(render, 250);
      warnModal.show();
    }
    function check() {
      if (warnEl) return render();
      if ((Date.now() - lastActive) / 1000 >= SESSION.idle - SESSION.warn) showWarning();
    }
    var lastBump = 0;
    function activity() {
      if (warnEl) return; // while warning is open, only "Stay signed in" extends the session
      var now = Date.now();
      if (now - lastBump < 1000) return;
      lastBump = now; lastActive = now;
    }
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"].forEach(function (ev) {
      document.addEventListener(ev, activity, { passive: true, capture: true });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) check(); });
    setInterval(check, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSessionTimeout); else initSessionTimeout();

  /* ---------- Field help (i) popovers ----------
   * Buttons with [data-help] open a small explanation next to the label.
   * Delegated so it also works for fields added later (e.g. extra IBAN rows).
   * Closes on outside click, Esc, or when another help opens. */
  function helpPop(btn) {
    return bootstrap.Popover.getOrCreateInstance(btn, {
      trigger: "manual", html: true, placement: "top", fallbackPlacements: ["bottom", "right", "left"],
      container: btn.closest(".modal") || "body", customClass: "nama-pop", offset: [0, 10]
    });
  }
  function closeHelps(except) {
    document.querySelectorAll("[data-help][aria-expanded='true']").forEach(function (b) {
      if (b !== except) { helpPop(b).hide(); b.setAttribute("aria-expanded", "false"); }
    });
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-help]");
    if (btn) {
      e.preventDefault();
      closeHelps(btn);
      var open = btn.getAttribute("aria-expanded") === "true";
      helpPop(btn)[open ? "hide" : "show"]();
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      return;
    }
    if (!e.target.closest(".nama-pop")) closeHelps();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.querySelector("[data-help][aria-expanded='true']")) { e.stopPropagation(); closeHelps(); }
  }, true);
  window.addEventListener("resize", function () { closeHelps(); });

  /* ---------- ID type → ID number field (placeholder, hint, rules follow the type) ----------
   * NAMA.idField(selectEl, inputEl, specs[, helpBtn]) keeps the number field in step with
   * the chosen ID type: placeholder, hint text, error text, max length, keyboard and
   * allowed characters. Returns { valid(), apply() }. */
  var ID_SPECS = {
    personal: {
      nid: { ph: "1XXXXXXXXX", hint: "10-digit National ID number (starts with 1)", err: "National ID must be 10 digits and start with 1", re: /^1\d{9}$/, max: 10, numeric: true },
      iqama: { ph: "2XXXXXXXXX", hint: "10-digit Iqama number (starts with 2)", err: "Iqama number must be 10 digits and start with 2", re: /^2\d{9}$/, max: 10, numeric: true },
      gcc: { ph: "GCC ID number", hint: "National ID number issued by your GCC country (8–12 digits)", err: "GCC ID must be 8 to 12 digits", re: /^\d{8,12}$/, max: 12, numeric: true },
      passport: { ph: "e.g. A12345678", hint: "Passport number as printed on the passport (6–9 letters and digits)", err: "Passport number must be 6 to 9 letters and digits", re: /^[A-Z0-9]{6,9}$/, max: 9, numeric: false }
    },
    corporate: {
      unn: { ph: "700XXXXXXX", hint: "10-digit Unified National Number (starts with 7)", err: "Enter a valid 10-digit Unified National Number starting with 7", re: /^7\d{9}$/, max: 10, numeric: true,
        helpTitle: "What is the Unified National Number?", helpAbout: "Unified National Number",
        help: "<p>A 10-digit number starting with <b>7</b> that the Ministry of Commerce assigns to every registered business in Saudi Arabia. It stays the same even if your CR is renewed.</p><p class='help-where'><b>Where to find it:</b> at the top of your Commercial Registration (CR) certificate, or in your company profile on the Ministry of Commerce portal.</p>" },
      cr: { ph: "1010XXXXXX", hint: "10-digit Commercial Registration (CR) number", err: "Enter a valid 10-digit Commercial Registration number", re: /^\d{10}$/, max: 10, numeric: true,
        helpTitle: "What is the CR number?", helpAbout: "Commercial Registration number",
        help: "<p>The 10-digit Commercial Registration number issued by the Ministry of Commerce. The first four digits show the city of issue (for example <b>1010</b> for Riyadh, <b>4030</b> for Jeddah).</p><p class='help-where'><b>Where to find it:</b> on your CR certificate, or in your company profile on the Ministry of Commerce portal.</p>" }
    }
  };
  function idField(select, input, specs, helpBtn) {
    var col = input.closest('[class*="col-"]') || input.parentNode;
    var hintEl = col.querySelector(".form-text"), errEl = col.querySelector(".invalid-feedback");
    if (!hintEl) {
      hintEl = document.createElement("div");
      hintEl.className = "form-text";
      hintEl.id = input.id + "Hint";
      col.appendChild(hintEl);
      input.setAttribute("aria-describedby", hintEl.id);
    }
    function spec() { return specs[select.value] || specs[Object.keys(specs)[0]]; }
    function clean(v) {
      var sp = spec();
      v = sp.numeric ? String(v).replace(/\D+/g, "") : String(v).toUpperCase().replace(/[^A-Z0-9]+/g, "");
      return v.slice(0, sp.max);
    }
    function apply(typeChanged) {
      var sp = spec();
      input.placeholder = sp.ph;
      input.maxLength = sp.max;
      input.setAttribute("inputmode", sp.numeric ? "numeric" : "text");
      input.classList.toggle("is-upper", !sp.numeric);
      hintEl.textContent = sp.hint;
      if (errEl) errEl.textContent = sp.err;
      if (typeChanged) {
        input.classList.remove("is-invalid", "is-valid");
        input.removeAttribute("aria-invalid");
        if (input.value && (clean(input.value) !== input.value || !sp.re.test(input.value))) input.value = ""; // old number can't be valid for the new type
        hintEl.classList.remove("hint-flash");
        void hintEl.offsetWidth; // restart the highlight so the change is noticed
        hintEl.classList.add("hint-flash");
      }
      if (helpBtn && sp.help) {
        var pop = bootstrap.Popover.getInstance(helpBtn);
        if (pop) { pop.dispose(); helpBtn.setAttribute("aria-expanded", "false"); }
        helpBtn.setAttribute("data-bs-title", sp.helpTitle);
        helpBtn.setAttribute("data-bs-content", sp.help);
        helpBtn.setAttribute("aria-label", "Help: " + sp.helpAbout);
        helpBtn.removeAttribute("title");
      }
    }
    select.addEventListener("change", function () { apply(true); });
    input.addEventListener("input", function () { var c = clean(input.value); if (c !== input.value) input.value = c; });
    apply(false);
    return { valid: function () { return spec().re.test(clean(input.value)); }, apply: function () { apply(false); } };
  }

  /* ---------- Saudi National ID / Iqama with automatic type detection ----------
   * NAMA.autoId(input[, tagEl]) — one number field; the ID type is detected from the
   * first digit (1 = National ID, 2 = Iqama) and shown as a small tag inside the field.
   * Returns { type(), label(), valid() }. */
  var AUTO_ID = { "1": "National ID", "2": "Iqama" };
  function autoId(input) {
    var wrap = input.closest(".field") || input.parentNode;
    var col = input.closest('[class*="col-"]') || input.parentNode;
    var hintEl = col.querySelector(".form-text");
    var baseHint = hintEl ? hintEl.innerHTML : "";
    var tag = document.createElement("span");
    tag.className = "id-detect d-none";
    tag.setAttribute("aria-live", "polite");
    wrap.appendChild(tag);
    wrap.classList.add("has-detect");
    function type() { var c = input.value.charAt(0); return AUTO_ID[c] ? (c === "1" ? "nid" : "iqama") : ""; }
    function update() {
      var v = input.value.replace(/\D+/g, "").slice(0, 10);
      if (v !== input.value) input.value = v;
      var t = AUTO_ID[v.charAt(0)];
      tag.textContent = t || "";
      tag.classList.toggle("d-none", !t);
      tag.classList.remove("pop"); if (t) { void tag.offsetWidth; tag.classList.add("pop"); }
      if (hintEl) {
        if (v && !t) hintEl.innerHTML = '<span class="text-error">Starts with 1 for a National ID or 2 for an Iqama</span>';
        else if (t) hintEl.innerHTML = "Detected: <b>" + t + "</b> · " + (v.length < 10 ? (10 - v.length) + " more digit" + (10 - v.length === 1 ? "" : "s") : "10 digits");
        else hintEl.innerHTML = baseHint;
      }
    }
    input.addEventListener("input", update);
    update();
    return { type: type, label: function () { return AUTO_ID[input.value.charAt(0)] || ""; }, valid: function () { return /^[12]\d{9}$/.test(input.value); }, refresh: update };
  }

  /* ---------- Hijri (Umm al-Qura) ⇄ Gregorian dates ----------
   * NAMA.datePair(gregorianInput, hijriInput): two DD/MM/YYYY fields kept in sync —
   * typing a complete date in either one fills in the other. */
  var hijriFmt = null;
  try { hijriFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }); } catch (e) { hijriFmt = null; }
  function toHijri(date) {
    var p = {};
    hijriFmt.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    return { y: parseInt(p.year, 10), m: parseInt(p.month, 10), d: parseInt(p.day, 10) };
  }
  function fromHijri(y, m, d) {
    if (!hijriFmt || m < 1 || m > 12 || d < 1 || d > 30) return null;
    var guess = Date.UTC(622, 6, 19) + ((y - 1) * 354.36667 + (m - 1) * 29.5306 + (d - 1)) * 86400000;
    for (var off = -45; off <= 45; off++) {
      var dt = new Date(guess + off * 86400000), h = toHijri(dt);
      if (h.y === y && h.m === m && h.d === d) return dt;
    }
    return null;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function dmy(d, m, y) { return pad2(d) + "/" + pad2(m) + "/" + y; }
  function parseDmy(v) { var r = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); return r ? { d: +r[1], m: +r[2], y: +r[3] } : null; }
  function maskDate(input) {
    var v = input.value.replace(/\D+/g, "").slice(0, 8);
    var out = v.slice(0, 2) + (v.length > 2 ? "/" + v.slice(2, 4) : "") + (v.length > 4 ? "/" + v.slice(4) : "");
    if (out !== input.value) input.value = out;
  }
  var hijri = {
    fromGregorian: function (s) {
      var p = parseDmy(s); if (!p || !hijriFmt) return "";
      var dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
      if (dt.getUTCDate() !== p.d || dt.getUTCMonth() !== p.m - 1) return "";
      var h = toHijri(dt); return dmy(h.d, h.m, h.y);
    },
    toGregorian: function (s) {
      var p = parseDmy(s); if (!p) return "";
      var dt = fromHijri(p.y, p.m, p.d); return dt ? dmy(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()) : "";
    }
  };
  function datePair(g, h) {
    function flash(el) { el.classList.remove("synced"); void el.offsetWidth; el.classList.add("synced"); }
    function sync(src, dst, conv) {
      maskDate(src);
      if (src.value.length === 10) {
        var out = conv(src.value);
        if (out) { if (dst.value !== out) { dst.value = out; flash(dst); dst.classList.remove("is-invalid"); } }
        else mark(src, false);
      } else if (dst.disabled) dst.value = "";   // calculated field: clear until the date is complete
      else if (src.value.length === 0) dst.value = dst.getAttribute("data-synced") === "1" ? "" : dst.value;
      dst.setAttribute("data-synced", "1");
    }
    g.addEventListener("input", function () { sync(g, h, hijri.fromGregorian); });
    h.addEventListener("input", function () { sync(h, g, hijri.toGregorian); });
    return {
      date: function () { var p = parseDmy(g.value); return p ? new Date(p.y, p.m - 1, p.d) : null; },
      valid: function () { return !!hijri.fromGregorian(g.value) && !!hijri.toGregorian(h.value); },
      age: function () { var d = this.date(); return d ? (Date.now() - d) / 31557600000 : 0; }
    };
  }

  /* ---------- Field validation state (Figma: error / success) ---------- */
  function mark(el, ok, showValid) {
    if (!el) return ok;
    if (!validationOn) { el.classList.remove("is-invalid", "is-valid"); el.removeAttribute("aria-invalid"); return true; }
    el.classList.toggle("is-invalid", !ok);
    el.classList.toggle("is-valid", !!(ok && showValid));
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    return ok;
  }
  /* Validate every [required] control inside a container; returns first invalid element or null */
  function validateRequired(root) {
    if (!validationOn) return null;
    var first = null;
    root.querySelectorAll("input[required], select[required]").forEach(function (el) {
      if (el.closest(".d-none")) return;
      var ok = el.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) : el.value.trim() !== "";
      if (el.getAttribute("pattern")) ok = ok && new RegExp("^(?:" + el.getAttribute("pattern") + ")$").test(el.value.trim());
      mark(el, ok);
      if (!ok && !first) first = el;
    });
    root.querySelectorAll('input[type="email"]:not([required])').forEach(function (el) {
      var v = el.value.trim();
      var ok = !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      mark(el, ok);
      if (!ok && !first) first = el;
    });
    if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return first;
  }
  // Clear error state as soon as the user edits a field
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains("is-invalid") && el.value.trim() !== "") { el.classList.remove("is-invalid"); el.removeAttribute("aria-invalid"); }
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.tagName === "SELECT" && el.classList.contains("is-invalid") && el.value) { el.classList.remove("is-invalid"); el.removeAttribute("aria-invalid"); }
  });

  window.NAMA = { store: store, fmt: fmt, esc: esc, icon: icon, initials: initials, modal: modal, process: process, toast: toast, admin: admin, corp: corp, mark: mark, validateRequired: validateRequired, idField: idField, ID_SPECS: ID_SPECS, go: go, leave: leave, markDirty: markDirty, markClean: markClean, confirmLeave: confirmLeave, autoId: autoId, datePair: datePair, hijri: hijri, validationOn: validationOn, DEFAULTS: DEFAULTS };
})();
