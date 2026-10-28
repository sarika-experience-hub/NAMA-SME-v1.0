/*! register.js — Screen 2 Step 1: Corporate & Admin User Details
 * - Mobile number verified by OTP on field exit (or Verify). "Next" with an unverified mobile number
 *   opens the OTP pop-up instead of continuing (always, even with field validation switched off);
 *   once the code is verified the form continues automatically.
 * - On "Next": registry, employee-link and existing-relationship checks run, then branch.
 * - Employee ID type is detected from the first digit (1 = National ID, 2 = Iqama).
 * - Date of birth: Gregorian from a date picker; Hijri is disabled and calculated from it.
 * Prototype scenarios (last digit of Corporate ID):
 *   …5 → Corporate ID not found or not active (blocked)   [also: "Simulate" link under Corporate ID]
 *   …6 → mobile number not registered to the employee's ID (blocked)   [also: link under Mobile number]
 *   …1 → employee does not belong to the company (blocked)   [also: link under Employee ID]
 *   …2 → company exists in LOS but not in Digital Lending (credentials, then Digital onboarding)
 *   …4 → company exists in LOS and Digital Lending, no admin yet (credentials, then Home)
 *   …3 → admin account already exists (redirect to login)
 *   any other → new company, continue to credentials
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("registerForm"), nextBtn = $("nextBtn"), nextHint = $("nextHint");
  var mobile = $("mobile"), verifyBtn = $("verifyMobileBtn");
  var otpEl = $("otpModal"), otpModal = bootstrap.Modal.getOrCreateInstance(otpEl);
  var boxes = Array.prototype.slice.call(document.querySelectorAll("#otpBoxes input"));
  var otpVerify = $("otpVerify"), otpError = $("otpError"), otpResend = $("otpResend"), otpTimer = $("otpTimer");
  var verifiedNumber = null, timer = null;

  // Number fields follow the chosen ID type (placeholder, hint, error text, allowed characters)
  var corpIdField = NAMA.idField($("corpIdType"), $("corpIdNo"), NAMA.ID_SPECS.corporate, document.querySelector('label[for="corpIdNo"] [data-help]'));
  var empIdField = NAMA.autoId($("empIdNo"));
  // Date of birth: Gregorian from the date picker; Hijri is disabled and calculated from it
  var dobG = $("empDobG"), dobH = $("empDobH");
  function isoToDmy(v) { var r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return r ? r[3] + "/" + r[2] + "/" + r[1] : ""; }
  var today = new Date();
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  dobG.max = iso(today);
  function dobEmpty() { dobG.classList.toggle("is-empty", !dobG.value); }
  dobEmpty();
  function dobChanged() {
    dobEmpty();
    var h = NAMA.hijri.fromGregorian(isoToDmy(dobG.value)) || "";
    if (h !== dobH.value) {
      dobH.value = h;
      if (h) { dobH.classList.remove("synced"); void dobH.offsetWidth; dobH.classList.add("synced"); }
    }
  }
  dobG.addEventListener("input", dobChanged);
  dobG.addEventListener("change", dobChanged);
  var dob = {
    valid: function () { return !!dobH.value; },
    age: function () { return dobG.value ? (Date.now() - new Date(dobG.value + "T00:00:00")) / 31557600000 : 0; }
  };

  var rules = {
    corpIdNo: function () { return corpIdField.valid(); },
    corpName: function (v) { return v.length >= 3; },
    empName: function (v) { return v.trim().split(/\s+/).length >= 2; },
    empIdNo: function () { return empIdField.valid(); },
    mobile: function (v) { return /^5\d{8}$/.test(v); },
    email: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    empDobG: function () { return dob.valid() && dob.age() >= 18; }
  };
  // Field checks run before the "Validating your details" checks start. With the prototype's validation
  // switch off only the mobile number is checked (it must be valid and verified by OTP).
  function setState(el, ok, showValid) {
    el.classList.toggle("is-invalid", !ok);
    el.classList.toggle("is-valid", !!(ok && showValid));
    if (ok) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true");
    return ok;
  }
  // Review mode (validation switch off): only the mobile number is required; other fields aren't blocked
  function check(id, showValid) {
    var el = $(id);
    if (!NAMA.validationOn && id !== "mobile") return setState(el, true);
    return setState(el, rules[id](el.value.trim()), showValid);
  }
  var FIELDS = ["corpIdNo", "corpName", "empName", "empIdNo", "empDobG", "mobile", "email"];
  var errBox = $("regErrors"), errText = $("regErrorsText");
  function labelOf(id) {
    var l = document.querySelector('label[for="' + id + '"]');
    return l ? l.childNodes[0].textContent.trim() : id;
  }
  function showErrors() {
    var bad = FIELDS.filter(function (id) { return $(id).classList.contains("is-invalid"); });
    errBox.classList.toggle("d-none", !bad.length);
    if (bad.length) errText.textContent = (bad.length === 1 ? "1 field needs" : bad.length + " fields need") + " your attention: " + bad.map(labelOf).join(", ") + ".";
    return bad;
  }
  // While the error summary is showing, fields clear their error as soon as they're corrected
  form.addEventListener("input", function (e) {
    var id = e.target.id;
    if (errBox.classList.contains("d-none") || FIELDS.indexOf(id) < 0) return;
    if (e.target.classList.contains("is-invalid") && (id === "mobile" ? /^5\d{8}$/.test(e.target.value) : rules[id](e.target.value.trim()))) setState(e.target, true);
    showErrors();
  });
  form.addEventListener("change", function (e) { if (e.target.id === "empDobG" && e.target.classList.contains("is-invalid") && rules.empDobG()) { setState(e.target, true); showErrors(); } });

  // digits only for numeric fields
  mobile.addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value); });
  ["corpIdNo", "corpName", "empName", "empIdNo", "email", "empDobG"].forEach(function (id) {
    $(id).addEventListener("blur", function () { if (this.value.trim()) check(id, id !== "email" || !!this.value.trim()); });
  });

  function setVerified(on) {
    mobile.classList.toggle("is-valid", on);
    verifyBtn.classList.toggle("d-none", on);
    nextHint.classList.toggle("d-none", on || !NAMA.validationOn);
    $("mobileHint").innerHTML = on
      ? '<span class="verified-inline">' + NAMA.icon("circle-check", "ic-sm") + " Mobile number verified</span>"
      : "We'll send a one-time password (OTP) to verify this number.";
  }
  // "Next" is always clickable: if the mobile number isn't verified yet it opens the OTP pop-up
  // (this check applies even when the prototype's field validation is switched off)
  nextBtn.disabled = false;
  if (!NAMA.validationOn) nextHint.classList.add("d-none");
  var continueAfterOtp = false;
  mobile.addEventListener("input", function () {
    if (verifiedNumber && this.value !== verifiedNumber) { verifiedNumber = null; setVerified(false); }
    if (/^5\d{8}$/.test(this.value)) mobileError(false);
  });
  function mobileError(on, noFocus) {
    mobile.classList.toggle("is-invalid", on);
    if (on) { mobile.setAttribute("aria-invalid", "true"); if (!noFocus) { mobile.focus(); mobile.scrollIntoView({ block: "center" }); } }
    else mobile.removeAttribute("aria-invalid");
  }

  /* OTP triggered on mobile field exit (or the inline Verify action) */
  // fromBlur: leaving the field with a partial number shows the error only in validation mode;
  // Next and Verify always show it. Returns true when the pop-up is (being) shown.
  function openOtp(fromBlur) {
    if (verifiedNumber && verifiedNumber === mobile.value) return false;
    if (otpEl.classList.contains("show")) return true;
    if (!/^5\d{8}$/.test(mobile.value)) {
      if (fromBlur !== true || NAMA.validationOn) mobileError(true);
      return false;
    }
    var v = mobile.value;
    $("otpTarget").textContent = "+966 " + v.slice(0, 2) + " " + v.slice(2, 5) + " " + v.slice(5);
    boxes.forEach(function (b) { b.value = ""; });
    otpError.classList.add("d-none");
    document.getElementById("otpBoxes").classList.remove("is-invalid");
    otpVerify.disabled = true;
    startTimer();
    otpModal.show();
    return true;
  }
  mobile.addEventListener("blur", function (e) {
    if (!(this.value.length === 9 || (!NAMA.validationOn && this.value))) return;
    var opened = openOtp(true);
    // Leaving the field by clicking "Next": continue automatically once the code is verified
    if (opened && e.relatedTarget === nextBtn) continueAfterOtp = true;
  });
  verifyBtn.addEventListener("click", function () { openOtp(false); });
  otpEl.addEventListener("shown.bs.modal", function () { boxes[0].focus(); });
  otpEl.addEventListener("hidden.bs.modal", function () { if (!verifiedNumber) continueAfterOtp = false; });

  function startTimer() {
    var s = 30;
    clearInterval(timer);
    otpResend.disabled = true;
    otpResend.innerHTML = 'Resend in <span id="otpTimer">00:30</span>';
    timer = setInterval(function () {
      s--;
      var t = document.getElementById("otpTimer");
      if (t) t.textContent = "00:" + String(s).padStart(2, "0");
      if (s <= 0) { clearInterval(timer); otpResend.disabled = false; otpResend.textContent = "Resend code"; }
    }, 1000);
  }
  otpResend.addEventListener("click", function () { startTimer(); NAMA.toast("Code sent", "A new code was sent to your mobile."); });

  boxes.forEach(function (b, i) {
    b.addEventListener("input", function () {
      b.value = NAMA.fmt.digits(b.value).slice(-1);
      if (b.value && i < boxes.length - 1) boxes[i + 1].focus();
      otpVerify.disabled = boxes.some(function (x) { return !x.value; });
      otpError.classList.add("d-none");
      document.getElementById("otpBoxes").classList.remove("is-invalid");
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
      otpVerify.innerHTML = "Verify";
      if (code === "000000" && NAMA.validationOn) {
        otpError.classList.remove("d-none");
        document.getElementById("otpBoxes").classList.add("is-invalid");
        otpVerify.disabled = false;
        boxes[5].focus();
        return;
      }
      clearInterval(timer);
      verifiedNumber = mobile.value;
      setVerified(true);
      otpModal.hide();
      if (continueAfterOtp) { continueAfterOtp = false; form.requestSubmit(); return; }
      NAMA.toast("Mobile number verified", "You can now continue to the next step.");
    }, 700);
  });

  /* Prototype: "Simulate" links under Corporate ID, Employee ID and Mobile number run one failure scenario.
     Missing or invalid details are filled with demo data and the mobile number is treated as verified,
     so the reviewer goes straight to the "Validating your details" checks without field errors. */
  var simulate = null;
  var DEMO = { corpIdNo: "7009139170", corpName: "Al Noor Trading Company", empName: "Faisal Al-Qahtani", empIdNo: "1029485761", mobile: "501234567" };
  form.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sim]");
    if (!b) return;
    Object.keys(DEMO).forEach(function (id) {
      var el = $(id);
      if (!rules[id](el.value.trim())) { el.value = DEMO[id]; el.dispatchEvent(new Event("input", { bubbles: true })); }
    });
    if (!rules.empDobG()) { dobG.value = "1990-05-15"; dobChanged(); }
    if (!rules.email($("email").value.trim())) $("email").value = "";
    FIELDS.forEach(function (id) { setState($(id), true); });
    errBox.classList.add("d-none");
    if (verifiedNumber !== mobile.value) { verifiedNumber = mobile.value; setVerified(true); }
    simulate = b.getAttribute("data-sim");
    form.requestSubmit();
  });

  /* Next → third-party validations and branching */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    // 1. Required details first: inline errors + summary alert, nothing else runs
    ["corpIdNo", "corpName", "empName", "empIdNo", "empDobG", "email"].forEach(function (id) { check(id); });
    mobileError(!/^5\d{8}$/.test(mobile.value), true);
    var bad = showErrors();
    if (bad.length) {
      var f = $(bad[0]);
      f.focus();
      f.scrollIntoView({ block: "center" });
      return;
    }
    // 2. Mobile number verified by OTP, 3. then the registry / employee / relationship checks
    if (verifiedNumber !== mobile.value || !mobile.value) { continueAfterOtp = openOtp(false); return; }

    var corpId = $("corpIdNo").value || NAMA.DEFAULTS.corp.idNo, last = $("corpIdNo").value.slice(-1);
    // Failure scenario: chosen with a "Simulate" link, otherwise from the last digit of the Corporate ID
    var fail = simulate || { "5": "corp", "6": "mobile", "1": "employee" }[last] || null;
    simulate = null;
    if (fail) last = "";
    NAMA.store.set("corp", Object.assign({}, NAMA.DEFAULTS.corp, { idType: $("corpIdType").selectedOptions[0].text, idNo: corpId, name: $("corpName").value.trim() || NAMA.DEFAULTS.corp.name }));
    NAMA.store.set("admin", Object.assign({}, NAMA.DEFAULTS.admin, {
      name: $("empName").value.trim() || NAMA.DEFAULTS.admin.name, idType: empIdField.type() || "nid", idNo: $("empIdNo").value, dob: isoToDmy(dobG.value), dobHijri: dobH.value,
      mobile: mobile.value || NAMA.DEFAULTS.admin.mobile, email: $("email").value.trim()
    }));

    NAMA.process({
      title: "Validating your details",
      text: "We are verifying your corporate and employee details. This only takes a few seconds.",
      steps: ["Corporate ID exists & is active", "Mobile number belongs to the employee", "Employee belongs to the company", "Existing NAMA relationship check"],
      failAt: fail === "corp" ? 0 : fail === "mobile" ? 1 : fail === "employee" ? 2 : -1
    }).then(function (passed) {
      if (!passed && fail === "corp") {
        return NAMA.modal({
          type: "error", title: "Corporate ID not found or inactive",
          text: "We couldn't find an active company registered with this Corporate ID number. Please check the number or contact our call center for assistance.",
          primary: { label: "OK", onClick: function () { $("corpIdNo").focus(); } }
        });
      }
      if (!passed && fail === "mobile") {
        return NAMA.modal({
          type: "error", title: "Mobile number not verified",
          text: "This mobile number isn't registered to your ID number. Please use the mobile number registered to your National ID or Iqama.",
          primary: { label: "OK", onClick: function () { mobile.focus(); } }
        });
      }
      if (!passed) {
        return NAMA.modal({
          type: "error", title: "Employee verification failed",
          text: "We couldn't confirm that you are registered as an employee of this company. Please check your employee ID number, or contact our call center for assistance.",
          primary: { label: "OK" }
        });
      }
      if (last === "3") {
        return NAMA.modal({
          type: "warning", title: "Administrator already exists",
          text: "An administrator account already exists for this company. Please log in using the existing administrator account.",
          secondary: { label: "Cancel" }, primary: { label: "Go to Login", href: "login.html", variant: "btn-primary" }
        });
      }
      if (last === "2") {
        // Exists in LOS only → create the admin and complete Digital onboarding
        NAMA.store.set("branch", "los");
        return NAMA.modal({
          type: "info", title: "Welcome back to NAMA",
          text: "Your company is already registered with NAMA. Let's continue by setting up your account and completing the remaining Digital onboarding steps.",
          primary: { label: "Continue", href: "register-credentials.html" }
        });
      }
      if (last === "4") {
        // Exists in LOS and Digital Lending without an admin → create the admin (SME Admin profile)
        NAMA.store.set("branch", "existing");
        return NAMA.modal({
          type: "info", title: "Welcome back to NAMA",
          text: "Your company is already registered with NAMA. Let's continue by creating your administrator account.",
          primary: { label: "Continue", href: "register-credentials.html" }
        });
      }
      NAMA.store.set("branch", "new");
      NAMA.go("register-credentials.html");
    });
  });
})();
