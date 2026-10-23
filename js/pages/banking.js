/*! banking.js — Screen 4 Step 2: Banking Relationship & SME IBAN
 * Up to 3 IBAN + certificate pairs; each pair is its own removable section.
 * IBANs are validated with the ISO 13616 mod-97 checksum and the bank is
 * detected from the Saudi bank code. */
(function () {
  "use strict";
  var MAX = 3;
  var list = document.getElementById("ibanList"), tpl = document.getElementById("ibanTpl");
  var addBtn = document.getElementById("addIban"), count = document.getElementById("ibanCount");
  var BANKS = {
    "05": "Alinma Bank", "10": "Saudi National Bank", "15": "Bank Albilad", "20": "Riyad Bank",
    "30": "Arab National Bank", "40": "Saudi National Bank", "45": "Saudi Awwal Bank (SAB)", "50": "Saudi Awwal Bank (SAB)",
    "55": "Banque Saudi Fransi", "60": "Bank AlJazira", "65": "Saudi Investment Bank", "80": "Al Rajhi Bank"
  };

  function raw(v) { return String(v || "").toUpperCase().replace(/[^0-9A-Z]/g, ""); }
  function valid(body) {
    if (!/^\d{2}[0-9A-Z]{20}$/.test(body)) return false;
    var s = body.slice(2) + "SA" + body.slice(0, 2);
    var r = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      var d = /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
      for (var j = 0; j < d.length; j++) r = (r * 10 + Number(d.charAt(j))) % 97;
    }
    return r === 1;
  }
  function format(body) {
    var out = body.slice(0, 2), rest = body.slice(2);
    for (var i = 0; i < rest.length; i += 4) out += " " + rest.slice(i, i + 4);
    return out.trim();
  }

  function wire(block) {
    var input = block.querySelector(".iban-input"), help = block.querySelector(".iban-help");
    input.addEventListener("input", function () {
      var body = raw(input.value).replace(/^SA/, "").slice(0, 22);
      input.value = format(body);
      var bank = BANKS[body.slice(2, 4)];
      if (body.length === 22) {
        var ok = valid(body);
        NAMA.mark(input, ok, ok);
        help.innerHTML = ok && bank ? '<span class="bank-detect">' + NAMA.icon("landmark", "ic-sm") + " " + bank + "</span>" : ok ? "Valid IBAN" : "";
      } else {
        input.classList.remove("is-invalid", "is-valid");
        help.innerHTML = bank && body.length >= 4 ? '<span class="bank-detect">' + NAMA.icon("landmark", "ic-sm") + " " + bank + "</span>" : "24 characters including SA. The bank is detected automatically.";
      }
    });
    block.addEventListener("upload:change", function () {
      block.querySelector(".cert-err").classList.add("d-none");
    });
    NAMA.wireUploads(block);
  }

  function refresh() {
    var blocks = list.querySelectorAll("[data-iban]");
    // Exactly one IBAN is the primary settlement account (the first one by default)
    var primary = list.querySelector('[data-iban][data-primary="true"]') || blocks[0];
    blocks.forEach(function (b, i) {
      var isPrimary = b === primary;
      b.setAttribute("data-primary", isPrimary ? "true" : "false");
      b.classList.toggle("is-primary", isPrimary && blocks.length > 1);
      b.querySelector(".iban-title").textContent = "IBAN " + (i + 1);
      b.querySelector(".primary-pill").classList.toggle("d-none", !isPrimary);
      var sp = b.querySelector("[data-set-primary]");
      sp.classList.toggle("d-none", isPrimary);
      sp.setAttribute("aria-label", "Set IBAN " + (i + 1) + " as the primary settlement account");
      b.querySelector("[data-remove-iban]").classList.toggle("d-none", blocks.length === 1);
    });
    count.textContent = blocks.length + " of " + MAX;
    addBtn.disabled = blocks.length >= MAX;
    addBtn.innerHTML = NAMA.icon("circle-plus") + (blocks.length >= MAX ? " Maximum of 3 IBANs reached" : " Add another IBAN");
  }

  function savePrimary() {
    var blocks = Array.prototype.slice.call(list.querySelectorAll("[data-iban]"));
    var idx = blocks.findIndex(function (x) { return x.getAttribute("data-primary") === "true"; });
    NAMA.store.set("primaryIban", Math.max(idx, 0) + 1);
    // Keep the accounts for the Review step (UI review mode: empty IBANs fall back to the demo account)
    var demo = NAMA.DEFAULTS.ibanList[0];
    NAMA.store.set("ibanList", blocks.map(function (b, i) {
      var body = raw(b.querySelector(".iban-input").value).replace(/^SA/, "");
      var file = b.querySelector("[data-upload].is-done .u-meta .fw-600");
      return {
        iban: body ? "SA" + body.slice(0, 2) + " " + format(body).slice(3) : demo.iban,
        bank: BANKS[body.slice(2, 4)] || (body ? "Bank not recognised" : demo.bank),
        primary: i === Math.max(idx, 0),
        cert: file ? file.textContent : (body ? "" : demo.cert)
      };
    }));
  }

  list.querySelectorAll("[data-iban]").forEach(wire);
  refresh();

  addBtn.addEventListener("click", function () {
    if (list.querySelectorAll("[data-iban]").length >= MAX) return;
    var node = tpl.content.firstElementChild.cloneNode(true);
    list.appendChild(node);
    wire(node);
    refresh();
    node.classList.add("fade-in");
    node.querySelector(".iban-input").focus();
  });
  list.addEventListener("click", function (e) {
    var sp = e.target.closest("[data-set-primary]");
    if (sp) {
      var chosen = sp.closest("[data-iban]");
      list.querySelectorAll("[data-iban]").forEach(function (x) { x.setAttribute("data-primary", x === chosen ? "true" : "false"); });
      refresh();
      var pill = chosen.querySelector(".primary-pill");
      pill.classList.remove("pill-pop"); void pill.offsetWidth; pill.classList.add("pill-pop");
      NAMA.markDirty();
      return;
    }
    var rm = e.target.closest("[data-remove-iban]");
    if (!rm) return;
    var block = rm.closest("[data-iban]");
    NAMA.modal({
      type: "warning", title: "Remove this IBAN?",
      text: "The IBAN and its certificate will be removed from your onboarding details.",
      secondary: { label: "Keep" },
      primary: { label: "Remove", variant: "btn-danger", onClick: function () {
        var wasPrimary = block.getAttribute("data-primary") === "true";
        block.remove();
        refresh();
        if (wasPrimary && list.querySelectorAll("[data-iban]").length > 1) NAMA.toast("Primary account updated", "IBAN 1 is now your primary settlement account.");
      } }
    });
  });

  document.getElementById("bankForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!NAMA.validationOn) {
      savePrimary();
      NAMA.store.set("ibans", list.querySelectorAll("[data-iban]").length);
      NAMA.go("onboarding-documents.html");
      return;
    }
    var first = null;
    list.querySelectorAll("[data-iban]").forEach(function (b) {
      var input = b.querySelector(".iban-input");
      var ok = valid(raw(input.value).replace(/^SA/, ""));
      NAMA.mark(input, ok, ok);
      if (!ok && !first) first = input;
      var up = b.querySelector("[data-upload]").classList.contains("is-done");
      b.querySelector(".cert-err").classList.toggle("d-none", up);
      if (!up && !first) first = b.querySelector("[data-pick]");
    });
    if (first) { first.focus(); first.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    savePrimary();
    NAMA.store.set("ibans", list.querySelectorAll("[data-iban]").length);
    NAMA.go("onboarding-documents.html");
  });
})();
