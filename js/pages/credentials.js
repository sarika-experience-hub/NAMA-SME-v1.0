/*! credentials.js — Screen 2 Step 2: Username & Password / Sign Up
 * Inline password-strength and confirm-match validation; Sign Up stays disabled
 * until all rules pass. On success the admin is redirected to Login. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var user = $("username"), pw = $("password"), confirm = $("confirm"), btn = $("signUpBtn");
  var strength = $("pwStrength"), rulesEl = $("pwRules");

  // Notice when the company already exists in NAMA (branch from step 1)
  var branch = NAMA.store.get("branch");
  var NOTICE = {
    los: "Let's continue by setting up your account and completing the remaining Digital onboarding steps.",
    existing: "Let's continue by creating your administrator account."
  };
  if (NOTICE[branch]) {
    $("branchNotice").innerHTML = '<div class="alert-nama alert-info-nama no-close mb-4" role="status">' + NAMA.icon("info") +
      '<div><span class="alert-title">Your company is already registered with NAMA</span>' + NOTICE[branch] + "</div></div>";
  }
  var admin = NAMA.admin();
  if (admin && admin.name && !user.value) {
    user.placeholder = "e.g. " + admin.name.toLowerCase().split(/\s+/).slice(0, 2).join(".").replace(/[^a-z.]/g, "");
  }

  function userOk(v) { return /^[A-Za-z][A-Za-z0-9._]{5,19}$/.test(v); }
  function pwRules(v, u) {
    return {
      len: v.length >= 8, upper: /[A-Z]/.test(v), lower: /[a-z]/.test(v), num: /\d/.test(v),
      special: /[^A-Za-z0-9]/.test(v), user: !!v && (!u || v.toLowerCase().indexOf(u.toLowerCase()) === -1)
    };
  }
  var LABELS = ["—", "Weak", "Fair", "Good", "Strong"];

  function update() {
    var u = user.value.trim(), v = pw.value, r = pwRules(v, u);
    Object.keys(r).forEach(function (k) {
      var li = rulesEl.querySelector('[data-rule="' + k + '"]');
      li.classList.toggle("met", r[k] && !!v);
    });
    var met = Object.keys(r).filter(function (k) { return r[k]; }).length;
    var level = !v ? 0 : met <= 2 ? 1 : met <= 4 ? 2 : met === 5 ? 3 : 4;
    strength.setAttribute("data-level", level);
    strength.querySelector(".txt").textContent = LABELS[level];

    var allPw = Object.keys(r).every(function (k) { return r[k]; });
    if (u) NAMA.mark(user, userOk(u), true);
    if (v) NAMA.mark(pw, allPw || v.length < 3, allPw);
    var match = !!confirm.value && confirm.value === v;
    if (confirm.value) NAMA.mark(confirm, match || v.indexOf(confirm.value) === 0 && confirm.value.length < v.length, match);
    $("matchOk").classList.toggle("d-none", !match || !NAMA.validationOn);
    btn.disabled = NAMA.validationOn ? !(userOk(u) && allPw && match) : false;
  }
  if (!NAMA.validationOn) btn.disabled = false;
  [user, pw, confirm].forEach(function (el) { el.addEventListener("input", update); });
  confirm.addEventListener("blur", function () { if (confirm.value && confirm.value !== pw.value) NAMA.mark(confirm, false); });

  $("credForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border" aria-hidden="true"></span> Creating account';
    var a = NAMA.admin();
    a.username = user.value.trim() || a.username;
    NAMA.store.set("admin", a);
    NAMA.store.set("signupSuccess", true);
    setTimeout(function () { NAMA.go("login.html"); }, 900);
  });
})();
