/*! keypeople.js — Key People Details (field layout follows LOS)
 * Onboarding (Screen 4 Step 2) and application (Screen 5 Step 2.3, body[data-mode="application"]).
 * - Key people returned by the commercial registry are listed in the grid; their returned
 *   fields are read-only and they can't be deleted. Other key people can be added.
 * - On screen opening the identity service (Yakeen) is called for each registry key person
 *   (ID number + date of birth) and the mobile number is checked against the ID (Tahaquq).
 * - When a key person is added, the admin enters the ID number and date of birth and
 *   selects "Verify ID": the identity details are filled in from Yakeen. The ID must not
 *   be expired. The mobile number is checked (Tahaquq) when the key person is saved.
 * - Yakeen results are valid for 14 days (configurable): within that window the earlier
 *   result is reused, after it a fresh call is made.
 * - "Next" sends the key people for AML & blacklist screening (done by LOS).
 * Prototype: ID ending 0000 → identity check fails; 9999 → expired ID; mobile ending 000 → not registered to the ID. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var app = document.body.getAttribute("data-mode") === "application";
  var ID_LABEL = { nid: "National ID", iqama: "Iqama", gcc: "GCC ID", passport: "Passport" };
  var NAME_F = ["kpFirst", "kpMiddle", "kpThird", "kpFamily", "kpFirstAr", "kpMiddleAr", "kpThirdAr", "kpFamilyAr"];
  var REG_LOCK = ["kpType", "kpName", "kpIdType", "kpIdNo", "kpDobG", "kpDobH", "kpShare", "kpMobile"].concat(NAME_F);
  var YAKEEN_LOCK = ["kpName", "kpNat", "kpIssueG", "kpIssueH", "kpExpG", "kpExpH"].concat(NAME_F);
  var VALID_DAYS = 14; // Yakeen response validity (centrally configurable)

  /* ---------- Demo identity (Yakeen) and mobile (Tahaquq) services ---------- */
  var FIRST = [["Omar", "عمر"], ["Khalid", "خالد"], ["Noura", "نورة"], ["Ahmed", "أحمد"], ["Lama", "لمى"], ["Fahad", "فهد"]];
  var FAMILY = [["Hassan", "حسن"], ["Al-Ghamdi", "الغامدي"], ["Al-Shehri", "الشهري"], ["Al-Zahrani", "الزهراني"], ["Al-Harbi", "الحربي"]];
  function yakeen(r) {
    var id = String(r.kpIdNo || "1000000001");
    if (/0000$/.test(id)) return { ok: false };
    var d = Number(id.slice(-4)) || 1, y = /9999$/.test(id) ? 2024 : 2027 + d % 6;
    var exp = String(1 + d % 28).padStart(2, "0") + "/" + String(1 + d % 12).padStart(2, "0") + "/" + y;
    var iss = exp.slice(0, 6) + (y - 10);
    var out = { ok: true, expired: new Date(y, d % 12, 1 + d % 28) < new Date(),
      kpNat: r.kpIdType === "iqama" || id.charAt(0) === "2" ? "eg" : "sa",
      kpExpG: exp, kpExpH: NAMA.hijri.fromGregorian(exp), kpIssueG: iss, kpIssueH: NAMA.hijri.fromGregorian(iss) };
    if (!r.kpFirst) { // names come back from the identity service
      var f = FIRST[d % FIRST.length], fa = FAMILY[d % FAMILY.length];
      out.kpFirst = f[0]; out.kpFirstAr = f[1]; out.kpFamily = fa[0]; out.kpFamilyAr = fa[1];
    }
    return out;
  }
  function tahaquq(mobile) { return !!mobile && !/000$/.test(mobile); }
  function fullName(r) { return [r.kpFirst, r.kpMiddle, r.kpThird, r.kpFamily].filter(Boolean).join(" "); }
  function age(dobG) {
    var p = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dobG || ""); if (!p) return "";
    var d = new Date(+p[3], +p[2] - 1, +p[1]), n = new Date(), a = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
    return a > 0 ? String(a) : "";
  }
  function applyYakeen(r) {
    var y = yakeen(r);
    r.yakeen = y.ok; r.idValid = y.ok && !y.expired; r.verifiedAt = new Date().toISOString();
    if (y.ok) Object.keys(y).forEach(function (k) { if (/^kp/.test(k)) r[k] = y[k]; });
    if (y.ok && !r.kpName) r.kpName = fullName(r);
    r.kpAge = age(r.kpDobG);
    return r;
  }
  // Registry key people: Yakeen on screen opening, then Tahaquq automatically
  function applyChecks(r) { applyYakeen(r); r.mobileOk = r.yakeen && tahaquq(r.kpMobile); return r; }
  function daysAgo(iso) { return iso ? Math.floor((Date.now() - new Date(iso)) / 864e5) : Infinity; }
  function fresh(r) { return r.yakeen !== undefined && daysAgo(r.verifiedAt) < VALID_DAYS; }
  function checkedText(r) { var d = daysAgo(r.verifiedAt); return d === Infinity ? "" : d === 0 ? "checked today" : "checked " + d + " day" + (d === 1 ? "" : "s") + " ago"; }

  // Application opened directly: show key people as verified during onboarding 3 days ago
  function demoDefaults() {
    var list = JSON.parse(JSON.stringify(NAMA.DEFAULTS.people));
    if (!app) return list;
    var when = new Date(Date.now() - 3 * 864e5).toISOString();
    list.forEach(function (r) { if (!r.kpMobile) r.kpMobile = "551112233"; applyChecks(r); r.verifiedAt = when; });
    return list;
  }

  /* ---------- Grid ---------- */
  var G;
  function statusLine(r) {
    var bits = [];
    if (r.yakeen === false) bits.push('<span class="st-bad">' + NAMA.icon("circle-alert", "ic-sm") + " Identity not verified</span>");
    else if (r.yakeen && !r.idValid) bits.push('<span class="st-bad">' + NAMA.icon("circle-alert", "ic-sm") + " ID expired " + NAMA.esc(r.kpExpG) + "</span>");
    else if (r.yakeen) bits.push('<span class="st-ok" title="' + checkedText(r) + '">' + NAMA.icon("circle-check", "ic-sm") + " ID valid to " + NAMA.esc(r.kpExpG) + (checkedText(r) ? ' <span class="st-when">· ' + checkedText(r) + "</span>" : "") + "</span>");
    else bits.push('<span class="st-wait">Identity check pending</span>');
    if (!r.kpMobile) bits.push('<span class="st-warn">' + NAMA.icon("triangle-alert", "ic-sm") + " Mobile needed</span>");
    else if (r.mobileOk) bits.push('<span class="st-ok">' + NAMA.icon("circle-check", "ic-sm") + " Mobile verified</span>");
    else if (r.yakeen !== undefined) bits.push('<span class="st-bad">' + NAMA.icon("circle-alert", "ic-sm") + " Mobile not verified</span>");
    return bits.join("");
  }
  function total(list) { return Math.round(list.reduce(function (s, r) { return s + (parseFloat(r.kpShare) || 0); }, 0) * 100) / 100; }
  function bad(r) { return r.yakeen === false || (r.yakeen && !r.idValid) || !r.kpMobile || (r.yakeen !== undefined && !r.mobileOk); }

  var mVerified = null; // verification result inside the open form
  G = NAMA.grid({
    card: $("kpGridCard"), table: $("kpGrid"), modal: $("personModal"),
    store: "people", defaults: demoDefaults(), noun: "key person",
    lockedMsg: "Returned by the commercial registry — can't be deleted",
    canDelete: function (r) { return r.src !== "registry"; },
    locked: function (r) { return (r.src === "registry" ? REG_LOCK : []).concat(r.yakeen ? YAKEEN_LOCK : []); },
    search: function (r) { return [r.kpName, r.kpIdNo, r.kpMobile, G ? G.text("kpType", r.kpType) : ""].join(" "); },
    columns: [
      { label: "Name", cls: "cell-main", cell: function (r) {
        var tag = r.src === "registry" ? '<span class="src-tag" title="Returned by the commercial registry">' + NAMA.icon("lock", "ic-sm") + " Registry</span>" : '<span class="src-tag added">Added by you</span>';
        return '<div class="kp-who"><span class="avatar">' + NAMA.initials(r.kpName) + '</span><div class="min-w-0"><div class="p-name">' + NAMA.esc(r.kpName || "New key person") + " " + tag + '</div><div class="kp-status">' + statusLine(r) + "</div></div></div>";
      } },
      { label: "Key people type", cell: function (r) { return NAMA.esc(G.text("kpType", r.kpType)) + (r.kpSign === "yes" ? '<div><span class="role-tag tag-sign">Signatory</span></div>' : ""); } },
      { label: "ID number", cell: function (r) { return '<span class="num">' + NAMA.esc(r.kpIdNo) + '</span><div class="small text-3">' + (ID_LABEL[r.kpIdType] || "") + "</div>"; } },
      { label: "Mobile 1", cell: function (r) { return r.kpMobile ? '<span class="num">+966 ' + NAMA.esc(r.kpMobile) + "</span>" : '<span class="text-3">—</span>'; } },
      { label: "Share %", cls: "num-col", cell: function (r) { return r.kpShare ? '<b class="num">' + NAMA.esc(r.kpShare) + "%</b>" : '<span class="text-3">—</span>'; } }
    ],
    onChange: function (list) {
      list.forEach(function (r) { r._bad = r.yakeen !== undefined && bad(r); });
      var t = total(list), f = $("kpTotal");
      $("kpTotalVal").textContent = t + "%";
      f.classList.toggle("is-ok", t === 100);
      f.classList.toggle("is-warn", t !== 100);
      $("kpErr").classList.add("d-none");
    },
    onOpen: function (r, isNew) {
      mVerified = r && r.yakeen !== undefined ? { idNo: r.kpIdNo, dob: r.kpDobG, ok: r.yakeen && r.idValid, r: r } : null;
      kpId.apply();
      showState(mVerified ? (mVerified.ok ? "ok" : "fail") : "idle", mVerified && !mVerified.ok ? failText(r) : "");
      $("kpMobile").classList.remove("is-invalid");
      $("kpVerifyBox").classList.toggle("is-registry", !!(r && r.src === "registry"));
    },
    validate: function (r) {
      if (!current() || !mVerified.ok) { showState("need"); return $("kpVerifyBtn"); }
      if (!NAMA.mark($("kpMobile"), /^5\d{8}$/.test(r.kpMobile))) return $("kpMobile");
      var sh = parseFloat(r.kpShare);
      if (!NAMA.mark($("kpShare"), r.kpShare !== "" && sh >= 0 && sh <= 100)) return $("kpShare");
      return null;
    },
    beforeSave: function (r, prev, done) {
      if (current() && mVerified.r) { ["yakeen", "idValid", "verifiedAt"].forEach(function (k) { r[k] = mVerified.r[k]; }); }
      else if (!NAMA.validationOn) { delete r.yakeen; delete r.idValid; delete r.verifiedAt; }
      if (!r.kpName) r.kpName = fullName(r) || "New key person";
      r.kpAge = age(r.kpDobG);
      if (!r.src) r.src = "added";
      // Mobile ownership (Tahaquq) is checked when the key person is saved
      var unchanged = prev && prev.kpMobile === r.kpMobile && prev.mobileOk;
      if (!r.kpMobile || unchanged || r.yakeen === undefined) { r.mobileOk = unchanged ? true : false; return done(true); }
      var save = G.form.querySelector("[data-modal-save]"), label = save.innerHTML, mob = $("kpMobile");
      save.disabled = true;
      save.innerHTML = '<span class="spinner-border" aria-hidden="true"></span> Checking mobile';
      setTimeout(function () {
        save.disabled = false; save.innerHTML = label;
        r.mobileOk = tahaquq(r.kpMobile);
        if (!r.mobileOk) {
          mob.classList.add("is-invalid");
          var col = mob.closest('[class*="col-"]'), fb = col.querySelector(".invalid-feedback");
          if (fb) fb.textContent = "This mobile number isn't registered to this ID. Use the mobile number registered to the key person's ID.";
          mob.focus();
          return done(false);
        }
        done(true);
      }, 900);
    },
    savedMsg: function (r) { return r.kpName + " is in the key people list."; }
  });

  /* ---------- In-form verification (Yakeen + Tahaquq) ---------- */
  var form = G.form, vBtn = $("kpVerifyBtn"), vState = $("kpVerifyState");
  var kpId = NAMA.idField($("kpIdType"), $("kpIdNo"), NAMA.ID_SPECS.personal);
  $("kpMobile").addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value); });
  // National ID starts with 1, Iqama with 2 — pick the ID type from the number
  $("kpIdNo").addEventListener("input", function () {
    var sel = $("kpIdType"), c = this.value.charAt(0);
    if ((sel.value === "nid" || sel.value === "iqama") && (c === "1" || c === "2")) {
      var t = c === "1" ? "nid" : "iqama";
      if (sel.value !== t) { sel.value = t; kpId.apply(); }
    }
  });
  $("kpShare").addEventListener("input", function () { this.value = this.value.replace(/[^\d.]/g, ""); });
  $("kpNetWorth").addEventListener("input", function () { var n = Number(NAMA.fmt.digits(this.value)); this.value = n ? NAMA.fmt.num(n) : ""; });
  ["kpDobG", "kpDobH"].forEach(function (id) { $(id).addEventListener("input", function () { setTimeout(function () { $("kpAge").value = age($("kpDobG").value); }, 0); }); });
  NAME_F.slice(0, 4).forEach(function (id) { $(id).addEventListener("input", function () { if (!$("kpName").disabled) $("kpName").value = fullName({ kpFirst: $("kpFirst").value, kpMiddle: $("kpMiddle").value, kpThird: $("kpThird").value, kpFamily: $("kpFamily").value }); }); });

  function current() { return mVerified && mVerified.idNo === $("kpIdNo").value && mVerified.dob === $("kpDobG").value; }
  function failText(r) {
    if (!r.yakeen) return "The ID number and date of birth don't match the national identity records.";
    return "This ID expired on " + r.kpExpG + ". Key people must have a valid ID.";
  }
  function showState(kind, msg) {
    var map = {
      idle: ["", "Not verified yet"], ok: ["ok", NAMA.icon("circle-check", "ic-sm") + " ID verified" + (mVerified && mVerified.r && checkedText(mVerified.r) ? " · " + checkedText(mVerified.r) : "")],
      fail: ["bad", NAMA.icon("circle-alert", "ic-sm") + " " + NAMA.esc(msg || "")], changed: ["warn", NAMA.icon("triangle-alert", "ic-sm") + " Details changed — verify again"],
      need: ["bad", NAMA.icon("circle-alert", "ic-sm") + " Verify the ID before saving"]
    }[kind];
    vState.className = "kp-vstate small " + map[0];
    vState.innerHTML = map[1];
    if (kind === "need") { vBtn.classList.remove("shake"); void vBtn.offsetWidth; vBtn.classList.add("shake"); }
  }
  $("kpMobile").addEventListener("input", function () {
    var fb = this.closest('[class*="col-"]').querySelector(".invalid-feedback"); if (fb) fb.textContent = "9 digits starting with 5";
  });
  ["kpIdNo", "kpDobG", "kpDobH"].forEach(function (id) {
    $(id).addEventListener("input", function () { if (mVerified) showState(current() ? (mVerified.ok ? "ok" : "fail") : "changed", mVerified.r ? failText(mVerified.r) : ""); });
  });

  vBtn.addEventListener("click", function () {
    if (NAMA.validationOn) {
      var okId = NAMA.mark($("kpIdNo"), kpId.valid()), okDob = NAMA.mark($("kpDobG"), !!NAMA.hijri.fromGregorian($("kpDobG").value));
      if (!okId || !okDob) return;
    } else { // UI review: fill in sample values so the check can run
      if (!$("kpIdNo").value) $("kpIdNo").value = "10" + String(Math.floor(10000000 + Math.random() * 89999999));
      if (!$("kpDobG").value) { $("kpDobG").value = "01/02/1980"; $("kpDobH").value = NAMA.hijri.fromGregorian("01/02/1980"); }
    }
    vBtn.disabled = true;
    vBtn.innerHTML = '<span class="spinner-border" aria-hidden="true"></span> Verifying';
    vState.className = "kp-vstate small"; vState.textContent = "Checking with the national identity service…";
    setTimeout(function () {
      vBtn.disabled = false;
      vBtn.innerHTML = NAMA.icon("shield-check", "ic-sm") + " Verify ID";
      var r = { kpIdType: $("kpIdType").value, kpIdNo: $("kpIdNo").value, kpDobG: $("kpDobG").value, kpFirst: $("kpFirst").value.trim() };
      applyYakeen(r);
      mVerified = { idNo: r.kpIdNo, dob: r.kpDobG, ok: r.yakeen && r.idValid, r: r };
      if (r.yakeen) {
        YAKEEN_LOCK.forEach(function (k) { var el = form.querySelector('[name="' + k + '"]'); if (el && r[k] !== undefined && !el.disabled) { el.value = r[k]; el.classList.remove("synced"); void el.offsetWidth; el.classList.add("synced"); } });
        if (!$("kpName").disabled) $("kpName").value = fullName({ kpFirst: $("kpFirst").value, kpMiddle: $("kpMiddle").value, kpThird: $("kpThird").value, kpFamily: $("kpFamily").value });
        $("kpAge").value = r.kpAge;
      }
      showState(mVerified.ok ? "ok" : "fail", failText(r));
    }, 1100);
  });

  /* ---------- Identity lookup for registry key people on screen opening ---------- */
  var strip = $("kpLookup");
  function lookupSummary(list) {
    var reg = list.filter(function (r) { return r.src === "registry"; });
    var noMobile = list.filter(function (r) { return !r.kpMobile; });
    if (!reg.length) { strip.className = "lookup-strip"; strip.innerHTML = ""; return; }
    var html = NAMA.icon(noMobile.length ? "triangle-alert" : "circle-check") + "<div><b>Identity details retrieved for " + reg.length + " key " + (reg.length === 1 ? "person" : "people") + " from the commercial registry.</b>";
    if (noMobile.length) html += " Add a mobile number for " + noMobile.map(function (r) { return NAMA.esc(r.kpName); }).join(", ") + " so it can be verified.";
    strip.className = "lookup-strip " + (noMobile.length ? "is-warn" : "is-ok");
    strip.innerHTML = html + "</div>";
  }
  // Earlier Yakeen results are reused while they are less than 14 days old
  var pending = G.list().filter(function (r) { return r.src === "registry" && !fresh(r); });
  if (pending.length) {
    strip.className = "lookup-strip";
    strip.innerHTML = '<span class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></span><div>Retrieving identity details for ' + pending.length + " key people and verifying their mobile numbers…</div>";
    setTimeout(function () { pending.forEach(applyChecks); G.render(); lookupSummary(G.list()); }, 1300);
  } else {
    var oldest = Math.max.apply(null, G.list().filter(function (r) { return r.yakeen !== undefined; }).map(function (r) { return daysAgo(r.verifiedAt); }).concat([0]));
    if (app || oldest > 0) {
      strip.className = "lookup-strip is-ok";
      strip.innerHTML = NAMA.icon("circle-check") + "<div><b>Identity checks reused.</b> The latest checks were done " + (oldest === 0 ? "today" : oldest + " day" + (oldest === 1 ? "" : "s") + " ago") + " and stay valid for " + VALID_DAYS + " days.</div>";
    } else lookupSummary(G.list());
  }

  /* ---------- Next → AML screening (done by LOS) ---------- */
  $("kpForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var list = G.list(), err = $("kpErr");
    if (NAMA.validationOn) {
      var issues = list.filter(function (r) { return r.yakeen === undefined || bad(r); });
      if (!list.length) { err.textContent = "Add at least one key person to continue."; err.classList.remove("d-none"); return; }
      if (issues.length) {
        err.textContent = "Fix the highlighted key people before continuing: " + issues.map(function (r) { return r.kpName || "New key person"; }).join(", ") + ".";
        err.classList.remove("d-none"); G.render(); return;
      }
    }
    NAMA.process({
      title: "Verifying Individual Information",
      text: "We are validating the information provided with the relevant government and compliance services. Please wait while we complete the required validations.",
      steps: ["Key people details", "AML & blacklist screening"]
    }).then(function (ok) { if (ok) NAMA.go(app ? "application-address.html" : "onboarding-address.html"); });
  });
})();
