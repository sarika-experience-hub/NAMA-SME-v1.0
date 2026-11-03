/*! tracker.js — Application Management & Tracking (Tracker), SME-APP-02 7.2.5
 * One card per application with product, current stage, status badge and the actions
 * for that status: Pending approval → View Application; Approved → View Application +
 * View Offer (in-portal notification sent); Contract Signed → View Application (signed
 * through Contract.sa, card issuance in progress, in-portal notification sent); Declined → View Application (next action
 * still open, Q-30); Draft → Complete Application.
 * Prototype: the "preview status" switch shows each status. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var ic = NAMA.icon;
  var STATUS = {
    pending: { badge: "status-pending", label: "Pending approval", stage: "Credit Assessment", active: 2,
      msg: ["info", "info", "Under assessment", "Your application is under assessment and waiting for approval. You can't submit another application while this one is under assessment. We'll notify you once a decision is available."] },
    approved: { badge: "status-approved", label: "Approved", stage: "Offer ready", active: 3,
      msg: ["success", "circle-check", "Application approved", "Good news — your application has been approved. Review your offer to see the approved limit for each card product and continue to contract signing."] },
    signed: { badge: "status-progress", label: "Contract Signed", stage: "Card Issuance", active: 4,
      msg: ["success", "circle-check", "Contract signed", "Your contract has been signed through Contract.sa. Your approved limits are now being set up for card issuance — we'll notify you when you can start adding employees and issuing cards."] },
    declined: { badge: "status-rejected", label: "Declined", stage: "Credit decision", active: 2, failed: true,
      msg: ["error", "circle-alert", "Application declined", "Your application wasn't approved this time. NAMA will contact you about the next steps."] },
    draft: { badge: "status-draft", label: "Draft", stage: "Not submitted", active: 1,
      msg: ["warning", "pencil", "Application not submitted yet", "Your draft is saved. Complete the remaining steps and submit it for credit assessment."] }
  };
  var STEPS = [["Onboarding", "onboarding-review.html"], ["Submitted", "application-review.html"], ["Credit Assessment"], ["Offer & Contract Signing"], ["Card Issuance"]];

  // Lifecycle button label follows the panel: "Hide Lifecycle" while shown, "View Lifecycle" while hidden
  function lifeLabel(open) { return open ? "Hide Lifecycle" : "View Lifecycle"; }
  ["show.bs.collapse", "hide.bs.collapse"].forEach(function (ev) {
    $("life1").addEventListener(ev, function (e) {
      if (e.target !== this) return;
      var b = $("lifeBtn");
      if (b) { b.textContent = lifeLabel(ev === "show.bs.collapse"); b.setAttribute("aria-expanded", ev === "show.bs.collapse"); }
    });
  });

  function render(key) {
    var st = STATUS[key];
    $("acStatus").className = "status " + st.badge;
    $("acStatus").textContent = st.label;
    $("acStage").textContent = st.stage;
    $("acStage").className = "stage-v" + (key === "approved" ? " text-success-nama" : key === "declined" ? " text-error" : "");
    $("acDateLbl").textContent = key === "draft" ? "Last saved" : "Submitted on";
    var view = '<a class="btn btn-secondary" href="application-review.html">View Application</a>';
    var open = $("life1").classList.contains("show");
    var life = '<button class="btn btn-soft" type="button" id="lifeBtn" data-bs-toggle="collapse" data-bs-target="#life1" aria-expanded="' + open + '" aria-controls="life1">' + lifeLabel(open) + "</button>";
    $("acActions").innerHTML = life + (key === "draft" ? '<a class="btn btn-primary" href="card-application.html">Complete Application ' + ic("arrow-right", "ic-sm") + "</a>"
      : key === "approved" ? view + '<button type="button" class="btn btn-success" id="viewOffer">View Offer ' + ic("arrow-right", "ic-sm") + "</button>" : view);
    $("acLife").innerHTML = STEPS.map(function (s, i) {
      var done = i < st.active, active = i === st.active, failed = st.failed && active;
      var dot = done ? ic("check") : failed ? ic("x") : String(i + 1);
      var cls = done ? "done" + (s[1] ? " is-link" : "") : active ? (failed ? "active is-failed" : "active") : "";
      var body = done && s[1] ? '<a class="step-link" href="' + s[1] + '"><span class="dot">' + dot + '</span><span class="lbl">' + s[0] + "</span></a>" : '<span class="dot">' + dot + '</span><span class="lbl">' + s[0] + "</span>";
      return '<li class="' + cls + '"' + (active ? ' aria-current="step"' : "") + ">" + body + (i < STEPS.length - 1 ? '<span class="line"></span>' : "") + "</li>";
    }).join("");
    var m = st.msg;
    $("acMsg").innerHTML = '<div class="alert-nama alert-' + m[0] + '-nama no-close" role="status">' + ic(m[1]) + '<div><span class="alert-title">' + m[2] + "</span>" + m[3] + "</div></div>";
    var offer = $("viewOffer");
    if (offer) offer.addEventListener("click", function () {
      NAMA.modal({ type: "info", title: "Offer review", text: "Reviewing the approved limits (accept, reject or appeal), contract signing through Contract.sa and the Nafith e-promissory note are part of the next design phase.", primary: { label: "OK" } });
    });
  }

  var current = NAMA.store.get("appStatus", "pending");
  var radio = document.querySelector('input[name="appStatus"][value="' + current + '"]');
  if (radio) radio.checked = true;
  render(current);
  document.querySelectorAll('input[name="appStatus"]').forEach(function (r) {
    r.addEventListener("change", function () {
      NAMA.store.set("appStatus", r.value);
      render(r.value);
      document.dispatchEvent(new Event("nama:notifications"));
      var T = { approved: "Application approved", signed: "Contract signed", declined: "Application declined" }[r.value];
      if (T) NAMA.toast(T, "An in-portal notification was added to the bell.", r.value === "declined" ? "error" : "");
    });
  });
})();
