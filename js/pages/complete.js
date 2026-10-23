/*! complete.js — Screen 4 Step 6: SME Successfully Onboarded.
 * Marks onboarding as complete so the admin's limited profile is lifted
 * (sidebar sections unlock) and subsequent logins land on Home.
 * "Continue to Application Screen" opens New Application Request — or, when the
 * admin arrived from a campaign for a specific product (?campaign=cards on the
 * Welcome page), goes straight to that product's application. */
(function () {
  "use strict";
  NAMA.store.set("onboarded", true);
  document.getElementById("sumIbans").textContent = NAMA.store.get("ibanList", NAMA.DEFAULTS.ibanList).length;
  document.getElementById("sumDocs").textContent = NAMA.store.get("docList", NAMA.DEFAULTS.docList).length;
  document.getElementById("sumPeople").textContent = NAMA.store.get("people", NAMA.DEFAULTS.people).length;
  document.querySelectorAll(".side-link.is-locked").forEach(function (l) {
    l.classList.remove("is-locked");
    l.removeAttribute("aria-disabled");
    var lock = l.querySelector(".lock");
    if (lock) lock.remove();
  });
  var campaign = NAMA.store.get("campaign", null);
  if (campaign === "cards") {
    document.getElementById("continueBtn").setAttribute("href", "card-application.html");
    document.getElementById("campaignNote").innerHTML = '<p class="small text-2 mb-3">' + NAMA.icon("credit-card", "ic-sm") + " You came to us for <b>NAMA Cards</b> — we'll take you straight to your Cards application.</p>";
  }
})();
