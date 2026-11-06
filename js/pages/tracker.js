/*! tracker.js — Application Management & Tracking (Tracker), SME-APP-02 7.2.5
 * One card per application with product, current stage, status badge and the actions of
 * the Application Lifecycle (section 6.2, 05 Nov):
 *   Draft → Continue Application                     In Review → View Application
 *   Pending Offer → View Offer (pop-up: Accept / Reject / Appeal) + View Application
 *   Application Declined → Appeal + View Application  Appeal in Review → View Application
 *   Offer Accepted → View Offer (contract via Contract.sa, then Promissory Note via Nafith —
 *     both by SMS to the authorized signatory, outside Digital Lending)
 *   Facility Granted → Employee Onboarding & Card Management + Limit Adjustment Request
 *   Offer Rejected / Offer Expired → View Application + Start New Application
 * The actions move the application along the lifecycle (Accept → Offer Accepted, Reject →
 * Offer Rejected, Appeal → Appeal in Review).
 * Prototype: the "preview status" switch shows every status. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var ic = NAMA.icon, esc = NAMA.esc;
  var app = NAMA.store.get("application", null) || NAMA.DEFAULTS.application;

  // Contract and Promissory Note signing (client note, 05 Nov)
  var SIGNING = '<ol class="alert-steps">' +
    "<li>Once the offer is accepted, an SMS is sent to the Authorized Signatory with a link to sign the contract through Contract.sa.</li>" +
    "<li>Once the contract is successfully signed, another SMS is sent to the Authorized Signatory with a link to sign the Promissory Note through Nafith.</li></ol>";
  var SIGNING_INTRO = "Contract signing and Promissory Note signing are handled externally, outside the Digital Lending platform:";

  // Lifecycle progress line on the card (done = before the active step)
  var STEPS = [["Onboarding", "onboarding-review.html"], ["Submitted", "application-review.html"], ["Credit Assessment"], ["Offer"], ["Contract & Promissory Note"], ["Facility Granted"]];

  // status → badge, customer-facing current stage, progress, message and actions (primary first)
  var A = {
    view: ["View Application", "application-review.html"],
    cont: ["Continue Application", "card-application.html"],
    offer: ["View Offer", "#offer"],
    appeal: ["Appeal", "#appeal"],
    start: ["Start New Application", "#new"],
    cards: ["Employee Onboarding & Card Management", "#cards"],
    limit: ["Limit Adjustment Request", "#limit"]
  };
  var STATUS = {
    draft: { stage: "Complete your application", active: 1, actions: [A.cont],
      msg: ["warning", "pencil", "Application not submitted yet", "Your draft is saved. Complete the remaining steps and submit it for credit assessment."] },
    review: { stage: "We’re assessing your application", active: 2, actions: [A.view],
      msg: ["info", "info", "Under assessment", "Your application is under assessment and waiting for approval. You can't submit another application while this one is under assessment. We'll notify you once a decision is available."] },
    offer: { stage: "Your offer is ready", active: 3, tone: "ok", actions: [A.offer, A.view],
      msg: ["success", "circle-check", "Your offer is ready", "Good news — your application has been approved. View the offer to see the approved limit for each card product, then accept, reject or appeal it."] },
    declined: { stage: "Assessment complete", active: 2, failed: true, tone: "bad", actions: [A.appeal, A.view],
      msg: ["error", "circle-alert", "Application declined", "Your application wasn't approved this time. You can appeal the decision and NAMA will review your application again."] },
    appeal: { stage: "We’re reviewing your appeal", active: 2, actions: [A.view],
      msg: ["info", "hourglass", "Appeal under review", "We're reviewing your appeal. You'll receive either a revised offer or a final decision."] },
    accepted: { stage: "Contract and Promissory note are sent to the authorized signatory", active: 4, actions: [A.offer],
      msg: ["info", "file-text", "Offer accepted", SIGNING_INTRO + SIGNING] },
    granted: { stage: "Your facility is active", active: STEPS.length, tone: "ok", actions: [A.cards, A.limit],
      msg: ["success", "circle-check", "Your facility is active", "The contract and the Promissory Note have been signed and your company is set up for cards. You can now onboard employees and manage cards, or request a limit adjustment."] },
    rejected: { stage: "You rejected the offer", active: 3, failed: true, actions: [A.view, A.start],
      msg: ["info", "info", "Offer rejected", "You rejected the offer and this application is closed. You can view the application or start a new one."] },
    expired: { stage: "Your offer is no longer valid", active: 3, failed: true, actions: [A.view, A.start],
      msg: ["warning", "clock", "Offer expired", "The offer was not accepted within its validity period and is no longer valid. You can view the application or start a new one."] }
  };

  // Lifecycle button label follows the panel: "Hide Lifecycle" while shown, "View Lifecycle" while hidden
  function lifeLabel(open) { return open ? "Hide Lifecycle" : "View Lifecycle"; }
  ["show.bs.collapse", "hide.bs.collapse"].forEach(function (ev) {
    $("life1").addEventListener(ev, function (e) {
      if (e.target !== this) return;
      var b = $("lifeBtn");
      if (b) { b.textContent = lifeLabel(ev === "show.bs.collapse"); b.setAttribute("aria-expanded", ev === "show.bs.collapse"); }
    });
  });

  var current = NAMA.appStatus();

  function render(key) {
    var st = STATUS[key];
    $("acStatus").className = "status " + NAMA.APP_BADGE[key];
    $("acStatus").textContent = NAMA.APP_STATUS[key];
    $("acStage").textContent = st.stage;
    $("acStage").className = "stage-v" + (st.tone === "ok" ? " text-success-nama" : st.tone === "bad" ? " text-error" : "");
    $("acDateLbl").textContent = key === "draft" ? "Last saved" : "Submitted on";
    var open = $("life1").classList.contains("show");
    var life = '<button class="btn btn-soft" type="button" id="lifeBtn" data-bs-toggle="collapse" data-bs-target="#life1" aria-expanded="' + open + '" aria-controls="life1">' + lifeLabel(open) + "</button>";
    $("acActions").innerHTML = life + st.actions.slice().reverse().map(function (a, i, arr) {
      var primary = i === arr.length - 1;
      var cls = "btn " + (primary ? (key === "offer" ? "btn-success" : "btn-primary") : "btn-secondary");
      return a[1].charAt(0) === "#"
        ? '<button type="button" class="' + cls + '" data-act="' + a[1].slice(1) + '">' + a[0] + "</button>"
        : '<a class="' + cls + '" href="' + a[1] + '">' + a[0] + (primary && key === "draft" ? " " + ic("arrow-right", "ic-sm") : "") + "</a>";
    }).join("");
    $("acLife").innerHTML = STEPS.map(function (s, i) {
      var done = i < st.active, active = i === st.active, failed = st.failed && active;
      var dot = done ? ic("check") : failed ? ic("x") : String(i + 1);
      var cls = done ? "done" + (s[1] ? " is-link" : "") : active ? (failed ? "active is-failed" : "active") : "";
      var body = done && s[1] ? '<a class="step-link" href="' + s[1] + '"><span class="dot">' + dot + '</span><span class="lbl">' + s[0] + "</span></a>" : '<span class="dot">' + dot + '</span><span class="lbl">' + s[0] + "</span>";
      return '<li class="' + cls + '"' + (active ? ' aria-current="step"' : "") + ">" + body + (i < STEPS.length - 1 ? '<span class="line"></span>' : "") + "</li>";
    }).join("");
    var m = st.msg;
    $("acMsg").innerHTML = '<div class="alert-nama alert-' + m[0] + '-nama no-close" role="status">' + ic(m[1]) + '<div><span class="alert-title">' + m[2] + "</span>" + m[3] + "</div></div>";
  }

  // Move the application to another status (preview switch or an action on the card / offer)
  var NOTIFY = { offer: "Application approved", declined: "Application declined", granted: "Facility granted", expired: "Offer expired" };
  function setStatus(key, fromSwitch) {
    // Previewing a status keeps Home in step: the demo application is used when none was submitted
    if (!NAMA.store.get("application", null)) NAMA.store.set("application", app);
    current = key;
    NAMA.store.set("appStatus", key);
    var r = document.querySelector('input[name="appStatus"][value="' + key + '"]');
    if (r) r.checked = true;
    render(key);
    document.dispatchEvent(new Event("nama:notifications"));
    if (fromSwitch && NOTIFY[key]) NAMA.toast(NOTIFY[key], "An in-portal notification was added to the bell.", key === "declined" || key === "expired" ? "error" : "");
  }

  /* ---------- Offer pop-up: approved limit per card product, group limit, Accept / Reject / Appeal ---------- */
  var offerEl = $("offerModal"), offerModal = bootstrap.Modal.getOrCreateInstance(offerEl);
  var products = (app.products || []).map(function (p) { return { name: p.name, requested: p.limit, approved: p.limit }; });
  var total = products.reduce(function (s, p) { return s + p.approved; }, 0);
  $("offerRows").innerHTML = products.map(function (p) {
    return "<tr><td>" + esc(p.name) + '</td><td class="num-col">' + NAMA.fmt.sar(p.requested) + '</td><td class="num-col">' + NAMA.fmt.sar(p.approved) + "</td></tr>";
  }).join("");
  $("offerTotal").textContent = NAMA.fmt.sar(total);

  function openOffer() {
    var accepted = current === "accepted";
    $("offerTitle").textContent = accepted ? "Accepted offer" : "Your offer";
    $("offerIntro").innerHTML = "Application <b class=\"text-body\">" + esc(app.ref) + "</b> has been approved with the following limits." +
      (accepted ? "" : " Review them, then accept, reject or appeal the offer.");
    $("offerNote").innerHTML = accepted
      ? '<div class="alert-nama alert-info-nama no-close mt-3 mb-0" role="status">' + ic("file-text") + '<div><span class="alert-title">You accepted this offer</span>' + SIGNING_INTRO + SIGNING + "</div></div>"
      : "";
    $("offerFoot").innerHTML = accepted
      ? '<button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>'
      : '<button type="button" class="btn btn-soft" data-offer="appeal">Appeal</button>' +
        '<button type="button" class="btn btn-secondary" data-offer="reject">Reject</button>' +
        '<button type="button" class="btn btn-success" data-offer="accept">' + ic("check", "ic-sm") + " Accept</button>";
    $("offerFoot").classList.toggle("end", accepted);
    offerModal.show();
  }
  // Run the next pop-up once the offer pop-up has closed (no stacked pop-ups)
  function afterOffer(fn) {
    if (!offerEl.classList.contains("show")) return fn();
    offerEl.addEventListener("hidden.bs.modal", fn, { once: true });
    offerModal.hide();
  }
  offerEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-offer]");
    if (!b) return;
    var what = b.getAttribute("data-offer");
    afterOffer(function () {
      if (what === "accept") {
        setStatus("accepted");
        NAMA.modal({
          type: "success", centered: true, title: "Offer accepted",
          html: '<p>You accepted the offer for application <b class="text-body">' + esc(app.ref) + "</b>.</p>" +
            '<p class="text-start mb-0">' + SIGNING_INTRO + "</p>" + SIGNING.replace("alert-steps", "alert-steps text-start"),
          primary: { label: "OK" }
        });
      } else if (what === "reject") confirmReject();
      else confirmAppeal();
    });
  });

  function confirmReject() {
    NAMA.modal({
      type: "warning", title: "Reject this offer?",
      text: "If you reject the offer, this application will be closed. You can start a new application afterwards.",
      secondary: { label: "Cancel" },
      primary: { label: "Reject offer", variant: "btn-danger", onClick: function () { setStatus("rejected"); NAMA.toast("Offer rejected", "Application " + app.ref + " is closed."); } }
    });
  }
  function confirmAppeal() {
    NAMA.modal({
      type: "info", title: "Appeal the decision?",
      text: "Your application will be reviewed again by NAMA. You'll receive either a revised offer or a final decision.",
      secondary: { label: "Cancel" },
      primary: { label: "Submit Appeal", onClick: function () { setStatus("appeal"); NAMA.toast("Appeal submitted", "We're reviewing your appeal."); } }
    });
  }
  function nextPhase(title, text) { NAMA.modal({ type: "info", title: title, text: text, primary: { label: "OK" } }); }

  // Actions on the application card
  $("acActions").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "offer") openOffer();
    else if (act === "appeal") confirmAppeal();
    else if (act === "new") {
      // The closed application stays on record; the new one starts from Step 1
      NAMA.store.remove("application");
      NAMA.store.remove("appDraft");
      NAMA.store.set("appStatus", "draft");
      NAMA.go("application-new.html");
    }
    else if (act === "cards") nextPhase("Employee Onboarding & Card Management", "Employee onboarding and card management open in the card management portal through single sign-on. This screen is part of the next design phase.");
    else if (act === "limit") nextPhase("Limit Adjustment Request", "Requesting a product or group limit adjustment from the Tracker is part of the next design phase.");
  });

  var radio = document.querySelector('input[name="appStatus"][value="' + current + '"]');
  if (radio) radio.checked = true;
  render(current);
  document.querySelectorAll('input[name="appStatus"]').forEach(function (r) {
    r.addEventListener("change", function () { setStatus(r.value, true); });
  });
})();
