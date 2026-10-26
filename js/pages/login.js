/*! login.js — Screen 3: Admin User Login
 * Credentials & status validation, then an SMS OTP. 3 failed attempts in a row
 * (wrong password or wrong code) suspend the admin user. Routing after login:
 *  - onboarding completed  → Dashboard (Home)
 *  - onboarding pending    → Corporate Details & KYB (start or continue)
 *  - authentication failed → stay on Login with an error banner
 * Prototype: password "wrong" → invalid credentials; OTP 000000 → wrong code;
 * username "locked" → suspended account. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("loginForm"), u = $("loginUser"), p = $("loginPass"), btn = $("loginBtn"), err = $("loginError");

  if (NAMA.store.get("signupSuccess")) {
    $("loginNotice").innerHTML = '<div class="alert-nama alert-success-nama mb-4" role="status">' + NAMA.icon("circle-check") +
      '<div><span class="alert-title">Account Created Successfully</span>Your Admin account has been created successfully. Please log in using your new credentials to continue with Corporate Onboarding.</div>' +
      '<button type="button" class="alert-close" data-dismiss-alert aria-label="Dismiss">' + NAMA.icon("x", "ic-sm") + "</button></div>";
    var a = NAMA.admin();
    if (a.username) u.value = a.username;
    NAMA.store.remove("signupSuccess");
  }

  var expiredMin = NAMA.store.get("sessionExpired", null);
  if (expiredMin) {
    $("loginNotice").innerHTML = '<div class="alert-nama alert-warning-nama mb-4" role="status">' + NAMA.icon("clock") +
      '<div><span class="alert-title">Your session has expired</span>For your security, you were logged out after ' + expiredMin +
      ' minutes of inactivity. Please log in again to continue.</div>' +
      '<button type="button" class="alert-close" data-dismiss-alert aria-label="Dismiss">' + NAMA.icon("x", "ic-sm") + "</button></div>";
    var ad = NAMA.admin();
    if (ad.username && !u.value) u.value = ad.username;
    NAMA.store.remove("sessionExpired");
  }

  /* Remember my username (this device only — the password is never stored) */
  var REM_KEY = "nama.rememberedUser";
  var remember = $("rememberMe"), notYou = $("notYouBtn");
  function remembered() { try { return localStorage.getItem(REM_KEY) || ""; } catch (e2) { return ""; } }
  function saveRemembered(v) { try { if (v) localStorage.setItem(REM_KEY, v); else localStorage.removeItem(REM_KEY); } catch (e2) { /* storage unavailable */ } }
  var rem = remembered();
  if (rem) {
    remember.checked = true;
    if (!u.value) u.value = rem;
    if (u.value === rem) {
      notYou.classList.remove("d-none");
      setTimeout(function () { p.focus(); }, 50);
    }
  }
  notYou.addEventListener("click", function () {
    saveRemembered("");
    u.value = ""; p.value = "";
    remember.checked = false;
    notYou.classList.add("d-none");
    u.focus();
  });
  u.addEventListener("input", function () { if (u.value !== rem) notYou.classList.add("d-none"); });

  function showError(title, text) {
    err.innerHTML = '<div class="alert-nama alert-error-nama" role="alert">' + NAMA.icon("circle-alert") +
      '<div><span class="alert-title">' + title + "</span>" + text + '</div><button type="button" class="alert-close" data-dismiss-alert aria-label="Dismiss">' + NAMA.icon("x", "ic-sm") + "</button></div>";
  }

  /* Forgot password (SME-ONB-BR-10): an admin still on the SME Onboarding Profile contacts
   * NAMA; once on the full SME Admin Profile, another admin resets it in User Management. */
  $("forgotLink").addEventListener("click", function (e) {
    e.preventDefault();
    NAMA.modal({
      type: "info", title: "Forgot your password?",
      html: '<ul class="modal-list">' +
        "<li>" + NAMA.icon("building", "ic-sm") + "<div><span class='ml-t'>Still completing your SME onboarding?</span>Contact NAMA at <a href=\"tel:8001240000\">800 124 0000</a> and we'll help you reset your password.</div></li>" +
        "<li>" + NAMA.icon("users", "ic-sm") + "<div><span class='ml-t'>Your SME is already onboarded?</span>Ask another SME Admin in your company to reset it from <b>User Management</b>. Your new password is sent to your registered email.</div></li></ul>",
      primary: { label: "OK" }
    });
  });

  /* Failed attempts (wrong password or wrong OTP): 3 in a row suspend the admin user */
  var MAX_TRIES = 3;
  function fails() { return NAMA.store.get("loginFails", 0); }
  function suspended() {
    btn.disabled = true;
    showError("Account suspended", "Your admin account has been suspended after " + MAX_TRIES + " unsuccessful login attempts. To reactivate it, ask another SME Admin in your company (User Management) or contact NAMA at 800 124 0000.");
  }
  function failed(title, field) {
    var n = fails() + 1;
    NAMA.store.set("loginFails", n);
    if (n >= MAX_TRIES) { suspended(); return true; }
    var left = MAX_TRIES - n;
    if (field) NAMA.mark(field, false);
    showError(title, "Please check and try again. " + left + " attempt" + (left === 1 ? "" : "s") + " left before your account is suspended.");
    return false;
  }
  if (fails() >= MAX_TRIES) suspended();

  /* Login OTP sent by SMS to the registered mobile */
  var otpEl = $("loginOtpModal"), otpModal = bootstrap.Modal.getOrCreateInstance(otpEl);
  var boxes = Array.prototype.slice.call(otpEl.querySelectorAll("#loginOtpBoxes input"));
  var otpVerify = $("loginOtpVerify"), otpErr = $("loginOtpError"), resend = $("loginOtpResend"), timer = null;
  function startTimer() {
    var t = 30;
    clearInterval(timer);
    resend.disabled = true;
    resend.innerHTML = 'Resend in <span id="loginOtpTimer">00:30</span>';
    timer = setInterval(function () {
      t--;
      var el = $("loginOtpTimer"); if (el) el.textContent = "00:" + String(t).padStart(2, "0");
      if (t <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = "Resend code"; }
    }, 1000);
  }
  resend.addEventListener("click", function () { startTimer(); NAMA.toast("Code sent", "A new code was sent to your registered mobile."); });
  function openOtp() {
    var m = (NAMA.admin().mobile || "501234567");
    $("loginOtpTarget").textContent = "+966 " + m.slice(0, 2) + " XXX XX" + m.slice(-2);
    boxes.forEach(function (b) { b.value = ""; });
    otpErr.classList.add("d-none");
    $("loginOtpBoxes").classList.remove("is-invalid");
    otpVerify.disabled = true;
    startTimer();
    otpModal.show();
  }
  otpEl.addEventListener("shown.bs.modal", function () { boxes[0].focus(); });
  otpEl.addEventListener("hidden.bs.modal", function () { clearInterval(timer); });
  boxes.forEach(function (b, i) {
    b.addEventListener("input", function () {
      b.value = NAMA.fmt.digits(b.value).slice(-1);
      if (b.value && i < boxes.length - 1) boxes[i + 1].focus();
      otpVerify.disabled = boxes.some(function (x) { return !x.value; });
      otpErr.classList.add("d-none");
      $("loginOtpBoxes").classList.remove("is-invalid");
    });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !b.value && i > 0) boxes[i - 1].focus();
      if (e.key === "Enter" && !otpVerify.disabled) otpVerify.click();
    });
    b.addEventListener("paste", function (e) {
      var d = NAMA.fmt.digits((e.clipboardData || window.clipboardData).getData("text")).slice(0, 6);
      if (!d) return;
      e.preventDefault();
      d.split("").forEach(function (c, j) { if (boxes[j]) boxes[j].value = c; });
      boxes[Math.min(d.length, 5)].focus();
      otpVerify.disabled = d.length < 6;
    });
  });
  otpVerify.addEventListener("click", function () {
    var code = boxes.map(function (b) { return b.value; }).join("");
    otpVerify.disabled = true;
    otpVerify.innerHTML = '<span class="spinner-border" aria-hidden="true"></span> Verifying';
    setTimeout(function () {
      otpVerify.innerHTML = "Verify &amp; Log in";
      if (code === "000000") {
        var n = fails() + 1;
        NAMA.store.set("loginFails", n);
        if (n >= MAX_TRIES) { otpModal.hide(); suspended(); return; }
        var left = MAX_TRIES - n;
        otpErr.textContent = "The code is incorrect. " + left + " attempt" + (left === 1 ? "" : "s") + " left before your account is suspended.";
        otpErr.classList.remove("d-none");
        $("loginOtpBoxes").classList.add("is-invalid");
        boxes.forEach(function (x) { x.value = ""; });
        boxes[0].focus();
        return;
      }
      otpModal.hide();
      complete();
    }, 700);
  });

  function complete() {
    NAMA.store.remove("loginFails");
    saveRemembered(remember.checked ? u.value.trim() : "");
    NAMA.store.set("session", true);
    NAMA.store.set("lastLogin", new Date().toISOString());
    // Company already onboarded in Digital Lending (registration branch "existing") → no onboarding needed
    if (NAMA.store.get("branch") === "existing") NAMA.store.set("onboarded", true);
    NAMA.go(NAMA.store.get("onboarded", false) ? "dashboard.html" : "onboarding-corporate.html");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.innerHTML = "";
    if (fails() >= MAX_TRIES) return suspended();
    var okU = NAMA.mark(u, !!u.value.trim()), okP = NAMA.mark(p, !!p.value);
    if (NAMA.validationOn && (!okU || !okP)) { showError("Missing details", "Enter your username and password to log in."); return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border" aria-hidden="true"></span> Logging in';
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = "Login";
      if (u.value.trim().toLowerCase() === "locked") {
        return showError("Account suspended", "Your admin account is suspended. To reactivate it, ask another SME Admin in your company (User Management) or contact NAMA at 800 124 0000.");
      }
      if (p.value === "wrong") return failed("Invalid username or password", p);
      openOtp();
    }, 800);
  });
})();
