/*! register.js — Screen 2 Step 1: Corporate & Admin User Details
 * - Mobile number verified by OTP on field exit; "Next" stays disabled until verified.
 * - On "Next": registry, employee-link and existing-relationship checks run, then branch.
 * - Employee ID type is detected from the first digit (1 = National ID, 2 = Iqama).
 * - Date of birth is captured in Hijri and Gregorian (each fills in the other).
 * Prototype scenarios (last digit of Corporate ID):
 *   …5 → Corporate ID not found or not active (blocked)
 *   …6 → mobile number not registered to the employee's ID (blocked)
 *   …1 → employee does not belong to the company (blocked)
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
  var dob = NAMA.datePair($("empDobG"), $("empDobH"));

  var rules = {
    corpIdNo: function () { return corpIdField.valid(); },
    corpName: function (v) { return v.length >= 3; },
    empName: function (v) { return v.trim().split(/\s+/).length >= 2; },
    empIdNo: function () { return empIdField.valid(); },
    mobile: function (v) { return /^5\d{8}$/.test(v); },
    email: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    empDobG: function () { return dob.valid() && dob.age() >= 18; },
    empDobH: function () { return dob.valid(); }
  };
  function check(id, showValid) { var el = $(id); return NAMA.mark(el, rules[id](el.value.trim()), showValid); }

  // digits only for numeric fields
  mobile.addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value); });
  ["corpIdNo", "corpName", "empName", "empIdNo", "email", "empDobG", "empDobH"].forEach(function (id) {
    $(id).addEventListener("blur", function () { if (this.value.trim()) check(id, id !== "email" || !!this.value.trim()); });
  });

  function setVerified(on) {
    mobile.classList.toggle("is-valid", on);
    verifyBtn.classList.toggle("d-none", on);
    nextBtn.disabled = !on;
    nextHint.classList.toggle("d-none", on);
    $("mobileHint").innerHTML = on
      ? '<span class="verified-inline">' + NAMA.icon("circle-check", "ic-sm") + " Mobile number verified</span>"
      : "We'll send a one-time password (OTP) to verify this number.";
  }
  // UI review mode: "Next" is available without mobile verification
  if (!NAMA.validationOn) { nextBtn.disabled = false; nextHint.classList.add("d-none"); }
  mobile.addEventListener("input", function () {
    if (verifiedNumber && this.value !== verifiedNumber) { verifiedNumber = null; setVerified(false); if (!NAMA.validationOn) { nextBtn.disabled = false; nextHint.classList.add("d-none"); } }
  });

  /* OTP triggered on mobile field exit (or the inline Verify action) */
  function openOtp() {
    if (verifiedNumber === mobile.value || otpEl.classList.contains("show")) return;
    if (!check("mobile")) return;
    var v = mobile.value;
    $("otpTarget").textContent = "+966 " + v.slice(0, 2) + " " + v.slice(2, 5) + " " + v.slice(5);
    boxes.forEach(function (b) { b.value = ""; });
    otpError.classList.add("d-none");
    document.getElementById("otpBoxes").classList.remove("is-invalid");
    otpVerify.disabled = true;
    startTimer();
    otpModal.show();
  }
  mobile.addEventListener("blur", function () { if (this.value.length === 9 || (!NAMA.validationOn && this.value)) openOtp(); });
  verifyBtn.addEventListener("click", openOtp);
  otpEl.addEventListener("shown.bs.modal", function () { boxes[0].focus(); });

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
      NAMA.toast("Mobile number verified", "You can now continue to the next step.");
    }, 700);
  });

  /* Next → third-party validations and branching */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = ["corpIdNo", "corpName", "empName", "empIdNo", "empDobG", "empDobH", "email"].map(function (id) { return check(id); }).every(Boolean);
    if (!ok) { var f = form.querySelector(".is-invalid"); if (f) f.focus(); return; }
    if (!verifiedNumber && NAMA.validationOn) { openOtp(); return; }

    var corpId = $("corpIdNo").value || NAMA.DEFAULTS.corp.idNo, last = $("corpIdNo").value.slice(-1);
    NAMA.store.set("corp", Object.assign({}, NAMA.DEFAULTS.corp, { idType: $("corpIdType").selectedOptions[0].text, idNo: corpId, name: $("corpName").value.trim() || NAMA.DEFAULTS.corp.name }));
    NAMA.store.set("admin", Object.assign({}, NAMA.DEFAULTS.admin, {
      name: $("empName").value.trim() || NAMA.DEFAULTS.admin.name, idType: empIdField.type() || "nid", idNo: $("empIdNo").value, dob: $("empDobG").value, dobHijri: $("empDobH").value,
      mobile: mobile.value || NAMA.DEFAULTS.admin.mobile, email: $("email").value.trim()
    }));

    NAMA.process({
      title: "Validating your details",
      text: "We are verifying your corporate and employee details. This only takes a few seconds.",
      steps: ["Corporate ID exists & is active", "Mobile number belongs to the employee", "Employee belongs to the company", "Existing NAMA relationship check"],
      failAt: last === "5" ? 0 : last === "6" ? 1 : last === "1" ? 2 : -1
    }).then(function (passed) {
      if (!passed && last === "5") {
        return NAMA.modal({
          type: "error", title: "Corporate ID not found or inactive",
          text: "We couldn't find an active company registered with this Corporate ID number. Please check the number or contact our call center for assistance.",
          primary: { label: "OK", onClick: function () { $("corpIdNo").focus(); } }
        });
      }
      if (!passed && last === "6") {
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
