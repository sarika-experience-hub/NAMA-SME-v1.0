/*! onboarding.js — shared behaviour for the onboarding (Screen 4) and application (Screen 5) steps:
 * file upload tiles (pick, drag & drop, progress, replace, remove) and Cancel confirmation. */
(function () {
  "use strict";

  function human(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }
  var MAX = 10 * 1048576;
  var OK_TYPES = /\.(pdf|jpe?g|png)$/i;

  function setIdle(tile) {
    tile.classList.remove("is-done", "is-uploading");
    tile.querySelector(".u-meta").textContent = tile.getAttribute("data-meta");
    tile.querySelector(".u-ic").innerHTML = NAMA.icon("file-text");
    tile.querySelector(".u-actions").innerHTML = '<button type="button" class="btn btn-sm btn-secondary" data-pick>' + NAMA.icon("upload", "ic-sm") + " Upload</button>";
    tile.querySelector("input[type=file]").value = "";
    tile.dispatchEvent(new CustomEvent("upload:change", { bubbles: true }));
  }

  function handle(tile, file) {
    if (!file) return;
    if (!OK_TYPES.test(file.name) || file.size > MAX) {
      NAMA.toast("File not accepted", "Upload a PDF, JPG or PNG file up to 10 MB.", "error");
      return;
    }
    tile.classList.remove("is-done");
    tile.classList.add("is-uploading");
    var bar = tile.querySelector(".u-bar span");
    tile.querySelector(".u-meta").textContent = "Uploading " + file.name + "…";
    tile.querySelector(".u-actions").innerHTML = "";
    var pct = 0;
    var t = setInterval(function () {
      pct = Math.min(100, pct + 14 + Math.random() * 22);
      bar.style.width = pct + "%";
      if (pct >= 100) {
        clearInterval(t);
        setTimeout(function () {
          tile.classList.remove("is-uploading");
          tile.classList.add("is-done");
          bar.style.width = "0%";
          tile.querySelector(".u-ic").innerHTML = NAMA.icon("file-check");
          tile.querySelector(".u-meta").innerHTML = '<span class="fw-600 text-body">' + NAMA.esc(file.name) + "</span> · " + human(file.size) + " · Uploaded";
          tile.querySelector(".u-actions").innerHTML =
            '<button type="button" class="btn btn-sm btn-link" data-pick>Replace</button>' +
            '<button type="button" class="btn btn-sm btn-icon btn-soft" data-clear aria-label="Remove file">' + NAMA.icon("trash", "ic-sm") + "</button>";
          tile.dispatchEvent(new CustomEvent("upload:change", { bubbles: true }));
        }, 200);
      }
    }, 160);
  }

  function wire(tile) {
    if (tile.__wired) return;
    tile.__wired = true;
    tile.setAttribute("data-meta", tile.querySelector(".u-meta").textContent);
    var input = tile.querySelector("input[type=file]");
    tile.addEventListener("click", function (e) {
      if (e.target.closest("[data-pick]")) input.click();
      if (e.target.closest("[data-clear]")) setIdle(tile);
    });
    input.addEventListener("change", function () { handle(tile, input.files[0]); });
    ["dragenter", "dragover"].forEach(function (ev) { tile.addEventListener(ev, function (e) { e.preventDefault(); tile.classList.add("is-drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { tile.addEventListener(ev, function (e) { e.preventDefault(); tile.classList.remove("is-drag"); }); });
    tile.addEventListener("drop", function (e) { handle(tile, e.dataTransfer.files[0]); });
  }
  window.NAMA.wireUploads = function (root) { (root || document).querySelectorAll("[data-upload]").forEach(wire); };
  window.NAMA.wireUploads();

  // Cancel → onboarding: back to login; application: back to Home (asks first if this page has unsaved changes)
  var cancel = document.getElementById("cancelBtn");
  if (cancel) {
    var app = document.body.getAttribute("data-mode") === "application";
    cancel.addEventListener("click", function () { NAMA.leave(app ? "dashboard.html" : "login.html"); });
  }
})();
