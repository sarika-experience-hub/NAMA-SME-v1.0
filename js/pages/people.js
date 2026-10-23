/*! people.js — Screen 6: Key People + Yakeen/AML validation stage.
 * On "Save & Verify" the person's identity and AML screening run; if all pass the
 * person is added (and another can be added or the admin goes to Home); if any
 * fails, the person is not added. Prototype: ID ending in 0000 fails identity check. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var modalEl = $("personModal"), modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  var form = $("personForm"), listEl = $("peopleList"), empty = $("peopleEmpty"), toDash = $("toDashboard");
  var ROLES = { owner: "Owner", partner: "Partner", ubo: "UBO", signatory: "Authorized Signatory" };
  var ID_TYPES = { nid: "National ID", iqama: "Iqama", gcc: "GCC ID", passport: "Passport" };
  var people = NAMA.store.get("people", []);
  var editing = -1, draft = null;
  var formDirty = false, allowHide = false;
  form.addEventListener("input", function () { formDirty = true; });
  form.addEventListener("change", function () { formDirty = true; });
  // Closing the form (Cancel, X or Esc) after typing asks before discarding
  modalEl.addEventListener("hide.bs.modal", function (e) {
    if (!formDirty || allowHide) { allowHide = false; return; }
    e.preventDefault();
    NAMA.modal({
      type: "warning", title: "Discard this person's details?",
      text: "You've entered details for this key person. If you close the form now, they won't be saved.",
      secondary: { label: "Keep editing", onClick: function () { var f = form.querySelector("input:not([type=radio]), select"); if (f) f.focus(); } },
      primary: { label: "Discard", variant: "btn-danger", onClick: function () { formDirty = false; allowHide = true; modal.hide(); } }
    });
  });

  function mask(id) { return id.length > 4 ? id.slice(0, 2) + "XXXXX" + id.slice(-3) : id; }
  function render() {
    $("kpCount").textContent = "(" + people.length + ")";
    empty.classList.toggle("d-none", people.length > 0);
    listEl.innerHTML = people.map(function (p, i) {
      var name = [p.first, p.family].join(" ").trim() || "Unnamed key person";
      var share = p.share ? " · Share " + NAMA.esc(p.share) + "%" : "";
      var sign = p.sign === "yes" ? ' <span class="role-tag" style="background:var(--nama-success-50);color:#047857">Signatory</span>' : "";
      return '<div class="person fade-in">' +
        '<span class="avatar">' + NAMA.initials(name) + "</span>" +
        '<div class="p-main"><div class="d-flex align-items-center gap-2 flex-wrap"><span class="p-name">' + NAMA.esc(name) + '</span><span class="role-tag">' + (ROLES[p.type] || "Key person") + "</span>" + sign + "</div>" +
        '<div class="p-meta">' + ID_TYPES[p.idType] + (p.idNo ? " · " + mask(p.idNo) : "") + (p.position ? " · " + NAMA.esc(p.position) : "") + share + "</div></div>" +
        '<span class="status status-completed d-none d-sm-inline-flex">' + NAMA.icon("check") + " Verified</span>" +
        '<div class="dropdown"><button type="button" class="btn btn-icon btn-soft" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Actions for ' + NAMA.esc(name) + '">' +
        '<svg class="ic ic-sm" aria-hidden="true"><use href="#i-chevron-down"/></svg></button><ul class="dropdown-menu dropdown-menu-end">' +
        '<li><button class="dropdown-item" data-edit="' + i + '">' + NAMA.icon("pencil", "ic-sm") + " Edit</button></li>" +
        '<li><button class="dropdown-item text-error" data-remove="' + i + '">' + NAMA.icon("trash", "ic-sm") + " Remove</button></li></ul></div>" +
        "</div>";
    }).join("");
    var ok = people.length > 0 || !NAMA.validationOn;
    toDash.classList.toggle("disabled", !ok);
    toDash.setAttribute("aria-disabled", ok ? "false" : "true");
    NAMA.store.set("people", people);
  }

  function fill(p) {
    form.reset();
    form.querySelectorAll(".is-invalid,.is-valid").forEach(function (el) { el.classList.remove("is-invalid", "is-valid"); });
    if (!p) return;
    var map = { kpType: "type", kpPosition: "position", kpIdType: "idType", kpIdNo: "idNo", kpIdExp: "idExp", kpDob: "dob", kpNat: "nat",
      kpFirst: "first", kpFirstAr: "firstAr", kpMiddle: "middle", kpMiddleAr: "middleAr", kpThird: "third", kpThirdAr: "thirdAr",
      kpFamily: "family", kpFamilyAr: "familyAr", kpShare: "share", kpShareVal: "shareVal", kpMobile: "mobile", kpEmail: "email" };
    Object.keys(map).forEach(function (id) { if ($(id)) $(id).value = p[map[id]] || ""; });
    [["kpGender", p.gender], ["kpSign", p.sign], ["kpContract", p.contract]].forEach(function (g) {
      var r = form.querySelector('input[name="' + g[0] + '"][value="' + g[1] + '"]'); if (r) r.checked = true;
    });
  }
  function read() {
    var g = function (n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ""; };
    return {
      type: $("kpType").value, position: $("kpPosition").value.trim(), idType: $("kpIdType").value, idNo: $("kpIdNo").value.trim(),
      idExp: $("kpIdExp").value, dob: $("kpDob").value, nat: $("kpNat").value, gender: g("kpGender"),
      first: $("kpFirst").value.trim(), firstAr: $("kpFirstAr").value.trim(), middle: $("kpMiddle").value.trim(), middleAr: $("kpMiddleAr").value.trim(),
      third: $("kpThird").value.trim(), thirdAr: $("kpThirdAr").value.trim(), family: $("kpFamily").value.trim(), familyAr: $("kpFamilyAr").value.trim(),
      share: $("kpShare").value.trim(), shareVal: $("kpShareVal").value.trim(), sign: g("kpSign"), contract: g("kpContract"),
      mobile: $("kpMobile").value.trim(), email: $("kpEmail").value.trim()
    };
  }

  function open(idx, data) {
    editing = typeof idx === "number" ? idx : -1;
    $("personTitle").textContent = editing >= 0 ? "Edit Key Person" : "Add Key Person";
    fill(data || (editing >= 0 ? people[editing] : null));
    kpId.apply(); // hint / placeholder for the ID type now selected
    formDirty = !!data; // re-opened after a failed verification keeps the guard on
    modal.show();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-person]")) open();
    var ed = e.target.closest("[data-edit]");
    if (ed) open(Number(ed.getAttribute("data-edit")));
    var rm = e.target.closest("[data-remove]");
    if (rm) {
      var i = Number(rm.getAttribute("data-remove"));
      NAMA.modal({
        type: "warning", title: "Remove key person?", text: "This person will be removed from your company's key people.",
        secondary: { label: "Keep" }, primary: { label: "Remove", variant: "btn-danger", onClick: function () { people.splice(i, 1); render(); } }
      });
    }
  });
  modalEl.addEventListener("shown.bs.modal", function () { $("kpType").focus(); });
  var kpId = NAMA.idField($("kpIdType"), $("kpIdNo"), NAMA.ID_SPECS.personal);
  ["kpMobile", "kpShareVal"].forEach(function (id) { $(id).addEventListener("input", function () { this.value = NAMA.fmt.digits(this.value); }); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = NAMA.validateRequired(form);
    var p = read();
    var checks = [
      ["kpIdNo", kpId.valid()],
      ["kpMobile", /^5\d{8}$/.test(p.mobile)],
      ["kpIdExp", !p.idExp || new Date(p.idExp) > new Date()],
      ["kpDob", !p.dob || (Date.now() - new Date(p.dob)) / 31557600000 >= 18]
    ];
    checks.forEach(function (c) { if (!NAMA.mark($(c[0]), c[1]) && !bad) bad = $(c[0]); });
    if (bad) { bad.focus(); bad.scrollIntoView({ block: "center" }); return; }
    draft = p;
    formDirty = false;
    modalEl.addEventListener("hidden.bs.modal", function run() {
      modalEl.removeEventListener("hidden.bs.modal", run);
      NAMA.process({
        title: "Verifying Individual Information",
        text: "We are validating the information provided with the relevant government and compliance services. Please wait while we complete the required validations.",
        steps: ["Identity verification (National ID / Iqama)", "AML & blacklist screening"],
        failAt: /0000$/.test(p.idNo) ? 0 : -1
      }).then(function (ok) {
        if (!ok) {
          return NAMA.modal({
            type: "error", title: "Verification failed",
            text: "We couldn't verify this person's identity, so they have not been added. Please review the details and try again.",
            secondary: { label: "Cancel" },
            primary: { label: "Review details", variant: "btn-primary", onClick: function () { open(editing >= 0 ? editing : undefined, draft); } }
          });
        }
        if (editing >= 0) people[editing] = p; else people.push(p);
        render();
        NAMA.toast("Key person added", ([p.first, p.family].join(" ").trim() || "The key person") + " was verified and added.");
      });
    });
    modal.hide();
  });

  render();
})();
