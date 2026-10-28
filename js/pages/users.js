/*! users.js — SME User Management (SME-SRV-03 section 7.8)
 * The SME Admin views, searches, adds and manages the users of the SME.
 * - Statuses: Active and Suspended. A new user is Active.
 * - 3-dot menu: Active → Edit, Suspend, Reset Password, Delete; Suspended → Edit, Reactivate, Delete.
 * - The logged-in SME Admin is listed but can't be managed here (managed by NAMA in Backoffice Studio).
 * - Username is assigned by the system; the password is system-generated, never shown, and sent by email.
 * - Profiles (set up in Backoffice Studio): Admin, Standard, View-only. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var PROFILE = {
    admin: { name: "Admin Profile", info: "All post-booking services plus SME User Management." },
    standard: { name: "Standard Profile", info: "Post-booking services without User Management, for regular employees." },
    view: { name: "View-only Profile", info: "Read-only access to cards, product / group limits and the application tracker, for finance or audit staff." }
  };
  var STATUS = { active: '<span class="pill pill-success">Active</span>', suspended: '<span class="pill pill-warning">Suspended</span>' };
  var ID_TYPE = { "1": "National ID", "2": "Iqama ID" };
  var admin = NAMA.admin();
  var DEFAULTS = [
    { me: true, umName: admin.name, umUser: admin.username, umIdNo: admin.idNo || "1029485761", umMobile: admin.mobile, umEmail: admin.email, umProfile: "admin", umStatus: "active" },
    { umName: "Omar Hassan Al-Zahrani", umUser: "omar.alzahrani", umIdNo: "1045678912", umDobG: "12/03/1988", umDobH: NAMA.hijri.fromGregorian("12/03/1988"), umMobile: "553214567", umEmail: "omar@alnoortrading.sa", umProfile: "standard", umStatus: "active" },
    { umName: "Noura Abdullah Al-Shehri", umUser: "noura.alshehri", umIdNo: "1067890123", umDobG: "25/07/1992", umDobH: NAMA.hijri.fromGregorian("25/07/1992"), umMobile: "556789012", umEmail: "noura@alnoortrading.sa", umProfile: "view", umStatus: "active" },
    { umName: "Rajesh Kumar Nair", umUser: "rajesh.nair", umIdNo: "2034567891", umDobG: "04/11/1985", umDobH: NAMA.hijri.fromGregorian("04/11/1985"), umMobile: "559876543", umEmail: "rajesh@alnoortrading.sa", umProfile: "standard", umStatus: "suspended" }
  ];
  function idType(v) { return ID_TYPE[String(v || "").charAt(0)] || ""; }
  function first(r) { return String(r.umName || "this user").split(/\s+/)[0]; }

  // System-assigned username: first name + family name (a number is added if it's already taken)
  function username(name, list) {
    var p = String(name || "").toLowerCase().replace(/[^a-z\s-]/g, "").split(/\s+/).filter(Boolean);
    var base = p.length ? (p.length > 1 ? p[0] + "." + p[p.length - 1].replace(/^al-?/, "al") : p[0]) : "user";
    var u = base, n = 2;
    while (list.some(function (r) { return r.umUser === u; })) u = base + n++;
    return u;
  }

  var G = NAMA.grid({
    card: $("umGridCard"), table: $("umGrid"), modal: $("userModal"),
    store: "smeUsers", defaults: DEFAULTS, noun: "user",
    search: function (r) { return [r.umName, r.umIdNo, r.umUser, r.umEmail].join(" "); },
    noMenu: function (r) { return r.me ? "Your own account is managed by NAMA" : ""; },
    onAction: onAction,
    extraActions: function (r) {
      return r.umStatus === "suspended"
        ? [{ act: "reactivate", label: "Reactivate", icon: "refresh" }]
        : [{ act: "suspend", label: "Suspend", icon: "lock" }, { act: "reset", label: "Reset Password", icon: "key" }];
    },
    columns: [
      { label: "Employee", cls: "cell-main", cell: function (r) {
        return '<span class="fw-600">' + NAMA.esc(r.umName) + "</span>" + (r.me ? ' <span class="src-tag">You</span>' : "") +
          '<div class="small text-3">' + NAMA.esc(r.umUser || "") + (r.umEmail ? " · " + NAMA.esc(r.umEmail) : "") + "</div>";
      } },
      { label: "Employee ID", cell: function (r) { return NAMA.esc(r.umIdNo) + '<div class="small text-3">' + idType(r.umIdNo) + "</div>"; } },
      { label: "Mobile", cell: function (r) { return r.umMobile ? "+966 " + NAMA.esc(r.umMobile) : "—"; } },
      { label: "Profile", cell: function (r) { return NAMA.esc((PROFILE[r.umProfile] || {}).name || "—"); } },
      { label: "Status", cell: function (r) { return STATUS[r.umStatus] || STATUS.active; } }
    ],
    onOpen: function (r, isNew) {
      idField.refresh();
      $("umIdType").value = idType($("umIdNo").value);
      if (isNew) $("umUser").value = "";
      profileHint();
    },
    beforeSave: function (r, prev, done) {
      if (!prev) { r.umStatus = "active"; r.umUser = username(r.umName, G.list()); }
      r.umIdType = idType(r.umIdNo);
      done(true);
    },
    savedToast: function (r, isNew) {
      return isNew
        ? ["User created", r.umName + " is active. The username and a system-generated password were sent to " + (r.umEmail || "the user's email") + "."]
        : ["Changes saved", r.umName + "'s details were updated."];
    },
    check: checkForm,
    saveLabel: function (isNew) { return isNew ? "Create User" : "Save changes"; },
    deleteText: function (r) { return r.umName + " will no longer be able to access the portal. The account is kept for audit purposes."; }
  });

  // Mandatory user information is always checked before a user is created or saved (SRV-03 7.8)
  var RULES = {
    umName: function (v) { return v.split(/\s+/).filter(Boolean).length >= 2; },
    umIdNo: function (v) { return /^[12]\d{9}$/.test(v); },
    umDobG: function (v) { return !!NAMA.hijri.fromGregorian(v); },
    umMobile: function (v) { return /^5\d{8}$/.test(v); },
    umEmail: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    umProfile: function (v) { return !!v; }
  };
  function mark(el, ok) {
    el.classList.toggle("is-invalid", !ok);
    if (ok) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true");
    return ok;
  }
  function checkForm() {
    var first = null;
    Object.keys(RULES).forEach(function (id) {
      var el = $(id);
      if (el.disabled) return;   // locked fields keep their saved value
      if (!mark(el, RULES[id](el.value.trim())) && !first) first = el;
    });
    return first;
  }
  Object.keys(RULES).forEach(function (id) {
    ["input", "change"].forEach(function (ev) {
      $(id).addEventListener(ev, function () { if (this.classList.contains("is-invalid") && RULES[id](this.value.trim())) mark(this, true); });
    });
  });
  // Clean up any blank user saved before these checks existed
  if (G.list().some(function (r) { return !r.me && !String(r.umName || "").trim(); })) {
    G.set(G.list().filter(function (r) { return r.me || String(r.umName || "").trim(); }));
  }

  // Employee ID → ID type (National ID / Iqama ID)
  var idField = NAMA.autoId($("umIdNo"));
  $("umIdNo").addEventListener("input", function () { $("umIdType").value = idType(this.value); });
  $("umMobile").addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value); });

  // Profile access summary under the drop-down
  var hint = $("umProfile").closest('[class*="col-"]').querySelector(".form-text");
  function profileHint() {
    var p = PROFILE[$("umProfile").value];
    hint.textContent = p ? p.info : "Select a profile to see its access.";
  }
  $("umProfile").addEventListener("change", profileHint);

  // Suspend / Reactivate / Reset Password — each asks for confirmation
  function setStatus(i, status, title, text) {
    var list = G.list();
    list[i].umStatus = status;
    G.set(list);
    NAMA.toast(title, text);
  }
  function onAction(act, i, r) {
    if (act === "suspend") {
      NAMA.modal({
        type: "warning", title: "Suspend " + r.umName + "?",
        text: first(r) + " won't be able to log in until the account is reactivated.",
        secondary: { label: "Cancel" },
        primary: { label: "Suspend", variant: "btn-danger", onClick: function () { setStatus(i, "suspended", "User suspended", r.umName + " can no longer log in."); } }
      });
    } else if (act === "reactivate") {
      NAMA.modal({
        type: "info", title: "Reactivate " + r.umName + "?",
        text: first(r) + " will be able to log in again with the same username and password.",
        secondary: { label: "Cancel" },
        primary: { label: "Reactivate", onClick: function () { setStatus(i, "active", "User reactivated", r.umName + " can log in again."); } }
      });
    } else if (act === "reset") {
      NAMA.modal({
        type: "info", title: "Reset " + first(r) + "'s password?",
        text: "A new system-generated password will be sent to " + (r.umEmail || "the user's email") + ". The current password will stop working.",
        secondary: { label: "Cancel" },
        primary: { label: "Reset Password", onClick: function () { NAMA.toast("Password reset", "A new password was sent to " + (r.umEmail || "the user's email") + "."); } }
      });
    }
  }
})();
