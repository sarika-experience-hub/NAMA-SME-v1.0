/*! grid.js — LOS-style record grid used by Key People, Address and Identification.
 * Search box + "Add …" button, read-only rows, a 3-dot menu per row (Edit / Delete)
 * and an Add / Edit form in a pop-up. Records are kept in the session store.
 *
 * NAMA.grid(opts) → { list(), set(list), render(), open(index), text(name, value) }
 * opts:
 *   card, table, modal         elements
 *   store, defaults            session key + demo rows when nothing is stored
 *   noun                       e.g. "key person" (titles, messages)
 *   columns                    [{ label, cell(r) → html, cls }]
 *   search(r)                  text the search box matches against
 *   canDelete(r)               false → Delete disabled (e.g. registry records)
 *   lockedMsg                  tooltip for a disabled Delete
 *   locked(r)                  field names that are read-only when editing r
 *   onOpen(r, isNew)           after the form is filled
 *   validate(r)                → first invalid element or null (validation on only)
 *   beforeSave(r, prev, done)  optional async step; call done(true) to save
 *   afterSave(r, list)         e.g. keep a single "primary" / "contact" record
 *   afterDelete(list)          e.g. move the "primary" flag back
 *   onChange(list)             after any change
 */
(function () {
  "use strict";

  function grid(o) {
    var card = o.card, tbody = o.table.querySelector("tbody");
    var modalEl = o.modal, form = modalEl.querySelector("form"), modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    var title = modalEl.querySelector(".m-title"), saveBtn = form.querySelector("[data-modal-save]");
    var search = card.querySelector("[data-grid-search]");
    var list = NAMA.store.get(o.store, null) || JSON.parse(JSON.stringify(o.defaults || []));
    var editing = -1, dirty = false, allowHide = false;

    // Hijri ⇄ Gregorian pairs inside the form
    form.querySelectorAll("input.date-in[id$='G']").forEach(function (g) {
      var h = document.getElementById(g.id.slice(0, -1) + "H");
      if (h) NAMA.datePair(g, h);
    });

    function fields() { return Array.prototype.slice.call(form.querySelectorAll("[name]")); }
    function text(name, v) {
      var el = form.querySelector('select[name="' + name + '"]');
      if (el) { var op = Array.prototype.find.call(el.options, function (x) { return x.value === v; }); return op && v ? op.text : (v || ""); }
      var r = form.querySelector('input[type=radio][name="' + name + '"][value="' + v + '"]');
      if (r) { var l = form.querySelector('label[for="' + r.id + '"]'); return l ? l.textContent : v; }
      return v || "";
    }
    function read() {
      var r = {};
      fields().forEach(function (el) {
        if (el.type === "radio") { if (el.checked) r[el.name] = el.value; else if (!(el.name in r)) r[el.name] = ""; }
        else if (el.type === "checkbox") r[el.name] = el.checked;
        else r[el.name] = el.value.trim();
      });
      return r;
    }
    function fill(r) {
      form.reset();
      form.querySelectorAll(".is-invalid,.is-valid").forEach(function (el) { el.classList.remove("is-invalid", "is-valid"); });
      var lock = r && o.locked ? o.locked(r) : [];
      fields().forEach(function (el) {
        var v = r ? r[el.name] : undefined;
        if (r && v !== undefined) {
          if (el.type === "radio") el.checked = el.value === v;
          else if (el.type === "checkbox") el.checked = !!v;
          else el.value = v;
        }
        var isLocked = lock.indexOf(el.name) >= 0 && !(el.type !== "checkbox" && el.type !== "radio" && !el.value);
        el.disabled = isLocked || el.hasAttribute("data-always-disabled");
        var col = el.closest('[class*="col-"]');
        if (col) col.classList.toggle("is-locked-field", isLocked);
      });
    }

    function render() {
      var q = (search && search.value || "").trim().toLowerCase();
      var rows = list.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return !q || o.search(x.r).toLowerCase().indexOf(q) >= 0; });
      tbody.innerHTML = rows.map(function (x) {
        var r = x.r, i = x.i, del = !o.canDelete || o.canDelete(r);
        var cells = o.columns.map(function (c) {
          return '<td data-label="' + c.label + '"' + (c.cls ? ' class="' + c.cls + '"' : "") + ">" + c.cell(r, i) + "</td>";
        }).join("");
        var menu = '<div class="dropdown"><button type="button" class="btn btn-icon btn-soft btn-sm" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Actions">' + NAMA.icon("more-vertical", "ic-sm") + "</button>" +
          '<ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item" data-grid-edit="' + i + '">' + NAMA.icon("pencil", "ic-sm") + " Edit</button></li>" +
          (del ? '<li><button type="button" class="dropdown-item text-error" data-grid-del="' + i + '">' + NAMA.icon("trash", "ic-sm") + " Delete</button></li>"
            : '<li><span class="dropdown-item disabled d-flex align-items-center gap-2" title="' + NAMA.esc(o.lockedMsg || "") + '">' + NAMA.icon("lock", "ic-sm") + " Can't delete</span></li>") + "</ul></div>";
        return '<tr class="' + (r._bad ? "is-bad" : "") + '">' + cells + '<td class="act-col">' + menu + "</td></tr>";
      }).join("");
      card.querySelector("[data-grid-count]").textContent = "(" + list.length + ")";
      card.querySelector("[data-grid-empty]").classList.toggle("d-none", list.length > 0);
      card.querySelector("[data-grid-nomatch]").classList.toggle("d-none", !list.length || rows.length > 0);
      NAMA.store.set(o.store, list);
      if (o.onChange) o.onChange(list);
    }

    function open(idx) {
      editing = typeof idx === "number" ? idx : -1;
      var r = editing >= 0 ? list[editing] : null;
      title.textContent = (editing >= 0 ? "Edit " : "Add ") + o.noun.replace(/^./, function (c) { return c.toUpperCase(); });
      saveBtn.innerHTML = NAMA.icon("check", "ic-sm") + (editing >= 0 ? " Save changes" : " Add to list");
      fill(r);
      if (o.onOpen) o.onOpen(r, editing < 0);
      dirty = false;
      modal.show();
    }

    card.querySelector("[data-grid-add]").addEventListener("click", function () { open(); });
    if (search) search.addEventListener("input", render);
    card.addEventListener("click", function (e) {
      var ed = e.target.closest("[data-grid-edit]");
      if (ed) return open(Number(ed.getAttribute("data-grid-edit")));
      var dl = e.target.closest("[data-grid-del]");
      if (dl) {
        var i = Number(dl.getAttribute("data-grid-del"));
        NAMA.modal({
          type: "warning", title: "Delete this " + o.noun + "?", text: "This " + o.noun + " will be removed from your company details.",
          secondary: { label: "Keep" },
          primary: { label: "Delete", variant: "btn-danger", onClick: function () { list.splice(i, 1); if (o.afterDelete) o.afterDelete(list); render(); NAMA.markDirty(); } }
        });
      }
    });

    form.addEventListener("input", function () { dirty = true; });
    form.addEventListener("change", function () { dirty = true; });
    modalEl.addEventListener("hide.bs.modal", function (e) {
      if (!dirty || allowHide) { allowHide = false; return; }
      e.preventDefault();
      NAMA.modal({
        type: "warning", title: "Discard your changes?", text: "You've entered details for this " + o.noun + ". If you close the form now, they won't be saved.",
        secondary: { label: "Keep editing" },
        primary: { label: "Discard", variant: "btn-danger", onClick: function () { dirty = false; allowHide = true; modal.hide(); } }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Disabled (locked) fields keep their stored value
      var prev = editing >= 0 ? list[editing] : null;
      var r = Object.assign({}, prev || {}, read());
      fields().forEach(function (el) { if (el.disabled && prev && el.name in prev) r[el.name] = prev[el.name]; });
      if (NAMA.validationOn) {
        var bad = NAMA.validateRequired(form) || (o.validate ? o.validate(r) : null);
        if (bad) { bad.focus(); bad.scrollIntoView({ block: "center" }); return; }
      }
      function commit(ok) {
        if (!ok) return;
        if (editing >= 0) list[editing] = r; else list.push(r);
        if (o.afterSave) o.afterSave(r, list);
        dirty = false; allowHide = true;
        modal.hide();
        render();
        NAMA.markDirty();
        NAMA.toast(editing >= 0 ? "Changes saved" : "Added to the list", o.savedMsg ? o.savedMsg(r) : "");
      }
      if (o.beforeSave) o.beforeSave(r, prev, commit); else commit(true);
    });

    Promise.resolve().then(render); // after the caller has its handle (column renderers may use it)
    return { list: function () { return list; }, set: function (l) { list = l; render(); }, render: render, open: open, text: text, form: form, modal: modal };
  }

  window.NAMA.grid = grid;
})();
