/* Meridian Transit – interaction animations
   Uses: addEventListener, classList.add / remove / toggle, setTimeout */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt) n.textContent = txt;
    return n;
  }
  /* Remove then re-add a class so a CSS animation plays again */
  function restart(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  /* 1. Sections fade and rise as they scroll into view */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -80px 0px" });
    reveals.forEach(function (s) { io.observe(s); });
  } else {
    reveals.forEach(function (s) { s.classList.add("in"); });
  }

  /* 2. Notifications (toasts) */
  var ICON = { info: "i", success: "\u2713", warn: "!", danger: "!" };
  var ADJ = { info: "Informative", success: "Confirmed", warn: "Cautionary", danger: "Urgent" };

  function dismiss(t) {
    if (t.dataset.gone) return;
    t.dataset.gone = "1";
    t.classList.add("leaving");
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
  }

  function notify(type, title, text) {
    var box = $("#toasts");
    if (!box) return;
    var t = el("div", "toast " + type);
    t.setAttribute("role", "status");
    var icon = el("span", "t-icon", ICON[type] || "i");
    icon.setAttribute("aria-hidden", "true");
    var body = el("div", "t-body");
    body.appendChild(el("b", "", title));
    body.appendChild(el("span", "t-text", text));
    body.appendChild(el("span", "t-adj", ADJ[type] || ADJ.info));
    var x = el("button", "t-close", "\u00d7");
    x.type = "button";
    x.setAttribute("aria-label", "Dismiss notification");
    x.addEventListener("click", function () { dismiss(t); });
    t.appendChild(icon); t.appendChild(body); t.appendChild(x);
    box.appendChild(t);
    var live = $$(".toast:not(.leaving)", box);
    if (live.length > 3) dismiss(live[0]);
    setTimeout(function () { dismiss(t); }, 4500);
  }
  window.notify = notify;

  /* 3. Press feedback on every button-like control */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".chip,.go,.btns button,.seg button,.route,.more-btn,.menu-toggle,.act,.preset");
    if (!b) return;
    b.classList.add("pressed");
    setTimeout(function () { b.classList.remove("pressed"); }, 300);
  });

  /* 4. Alerts: open and close detail cards (one at a time) */
  var list = $("#alertList");
  function setAlert(li, open) {
    li.classList.toggle("open", open);
    var b = $(".more-btn", li);
    b.setAttribute("aria-expanded", open);
    b.querySelector("span").textContent = open ? "Hide" : "Details";
  }
  list.addEventListener("click", function (e) {
    var b = e.target.closest(".more-btn");
    if (!b) return;
    var li = b.closest("li");
    var open = !li.classList.contains("open");
    $$("li.open", list).forEach(function (o) { if (o !== li) setAlert(o, false); });
    setAlert(li, open);
  });

  /* 5. Map: notify about the road that was selected */
  $("#roads").addEventListener("click", function (e) {
    var p = e.target.closest(".road");
    if (!p || !window.ROADS) return;
    var r = ROADS[p.id.replace("r_", "")];
    if (!r) return;
    if (r.s === "heavy") notify("danger", r.n, "Heavy congestion. Average speed " + r.sp + " km/h.");
    else if (r.s === "mod") notify("warn", r.n, "Moderate traffic. Average speed " + r.sp + " km/h.");
    else notify("success", r.n, "Flowing freely at " + r.sp + " km/h.");
  });

  /* 6. Smart signals */
  var demV = $("#demV");
  $("#dem").addEventListener("input", function () { restart(demV, "bump"); });
  $("#mAdapt").addEventListener("click", function () {
    notify("success", "Adaptive timing on", "Green time now follows Main Street demand.");
  });
  $("#mFixed").addEventListener("click", function () {
    notify("warn", "Fixed timing on", "Both roads get equal green time, so queues may grow.");
  });

  /* 7. Navigation results */
  $("#go").addEventListener("click", function () {
    notify("success", "Routes updated", "Ranked by live travel time.");
  });
  $("#results").addEventListener("click", function (e) {
    var r = e.target.closest(".route");
    if (r) notify("info", "Route highlighted", "Showing the " + r.querySelector("b").textContent + " option on the map.");
  });

  /* 8. Gallery info cards: slide up over the image, auto-close after 7 s */
  function setInfo(fig, open) {
    fig.classList.toggle("show-info", open);
    var b = $(".info-btn", fig);
    b.setAttribute("aria-expanded", open);
    b.setAttribute("aria-label", open ? "Hide details" : "Show details");
    clearTimeout(fig._t);
    if (open) fig._t = setTimeout(function () { setInfo(fig, false); }, 7000);
  }
  $(".gallery").addEventListener("click", function (e) {
    var hit = e.target.closest(".info-btn,.overlay,.art,img");
    if (!hit) return;
    var fig = hit.closest("figure");
    var open = !fig.classList.contains("show-info");
    $$(".gallery figure.show-info").forEach(function (f) { if (f !== fig) setInfo(f, false); });
    setInfo(fig, open);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $$(".gallery figure.show-info").forEach(function (f) { setInfo(f, false); });
  });

  /* 9. Camera tiles: click (or Enter) to run a scan, then report back */
  $$(".cam").forEach(function (c) {
    c.tabIndex = 0;
    function scan() {
      if (c.classList.contains("scan")) return;
      var name = $("p b", c).textContent;
      c.classList.add("scan");
      notify("info", name, "Scanning the view for incidents.");
      setTimeout(function () {
        c.classList.remove("scan");
        notify("success", name, "Scan complete. No new incidents detected.");
      }, 2700);
    }
    c.addEventListener("click", scan);
    c.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scan(); }
    });
  });

  /* 10. Collapsible panel */
  $$(".panel-head").forEach(function (h) {
    h.addEventListener("click", function () {
      var p = h.closest(".panel");
      var open = !p.classList.contains("open");
      p.classList.toggle("open", open);
      h.setAttribute("aria-expanded", open);
    });
  });

  /* 11. Report form: constraint validation, inline error messages, success message
       Uses: addEventListener, preventDefault, checkValidity, reportValidity, setCustomValidity */
  var f = $("#repForm"), done = $("#done"), summary = $("#formErrors");
  var dateF = $("#date"), pw = $("#pw"), pw2 = $("#pw2"), desc = $("#desc"), descCount = $("#descCount");
  var sending = false;

  /* Date seen: today at most, 30 days back at most (local time, not UTC) */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function setDate() {
    var t = new Date();
    dateF.max = ymd(t);
    dateF.min = ymd(new Date(t.getTime() - 30 * 864e5));
    dateF.value = ymd(t);
  }
  setDate();

  var controls = $$("input, select, textarea", f);
  var isGroup = function (c) { return c.type === "radio" || c.name === "type"; };
  /* A radio set or checkbox set is validated once, through its first member */
  function lead(c) { return isGroup(c) ? $('[name="' + c.name + '"]', f) : c; }
  var leads = controls.filter(function (c) { return lead(c) === c; });

  function labelOf(c) {
    if (c.type === "radio") return "Severity";
    if (c.name === "type") return "Issue type";
    if (c.id === "ok") return "Consent";
    var l = $('label[for="' + c.id + '"]', f);
    return l ? l.textContent.replace(/\s*\*$/, "").trim() : c.name;
  }
  function errBox(c) { return $("#err-" + (isGroup(c) ? c.name : c.id)); }

  /* Friendly text for each built-in constraint (required, type, min, max, minlength, pattern ...) */
  function builtIn(c) {
    var v = c.validity, n = labelOf(c);
    if (v.valueMissing) {
      if (c.type === "radio") return "Choose a severity level.";
      if (c.type === "checkbox") return "You must tick this box to send the report.";
      if (c.tagName === "SELECT") return "Choose a road from the list.";
      return n + " is required.";
    }
    if (v.typeMismatch) return c.type === "email" ? "Enter a valid email address, like you@example.com." : "Enter a valid " + c.type + ".";
    if (v.tooShort) return n + " must be at least " + c.minLength + " characters (you typed " + c.value.length + ").";
    if (v.tooLong) return n + " must be at most " + c.maxLength + " characters.";
    if (v.patternMismatch) return c.title || "Please match the requested format.";
    if (v.rangeUnderflow) return c.type === "date" ? "The date can't be earlier than " + c.min + "." : n + " must be at least " + c.min + ".";
    if (v.rangeOverflow) return c.type === "date" ? "The date can't be in the future." : n + " must be at most " + c.max + ".";
    if (v.stepMismatch) return n + " must be a multiple of " + c.step + ".";
    if (v.badInput) return "Enter a valid number.";
    return c.validationMessage;
  }

  /* Rules the HTML attributes cannot express */
  function extra(c) {
    var v = c.value, n = labelOf(c), x;
    if (c.name === "type") return $$('[name="type"]:checked', f).length ? "" : "Select at least one issue type.";
    if (c.required && (c.type === "text" || c.type === "tel" || c.tagName === "TEXTAREA") && !v.trim()) return n + " can't be blank.";
    if (c === pw2 && v !== pw.value) return "Passwords do not match.";
    if (c === desc && v.trim().split(/\s+/).length < 3) return "Describe the issue in at least 3 words.";
    if (c.type === "file" && c.files[0]) {
      x = c.files[0];
      if (!/^image\/(png|jpeg)$/.test(x.type)) return "Only JPG or PNG images are allowed.";
      if (x.size > 5 * 1048576) return "Choose a photo under 5 MB.";
    }
    return "";
  }

  function show(c, msg) {
    var box = errBox(c);
    if (box) box.textContent = msg;
    if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
    if (isGroup(c)) c.closest(".opts").classList.toggle("has-error", !!msg);
  }

  /* Validate one control: reset, test with checkValidity(), then store the message with setCustomValidity() */
  function validate(c) {
    c.setCustomValidity("");
    var msg = c.checkValidity() ? extra(c) : builtIn(c);
    if (msg) c.setCustomValidity(msg);
    show(c, msg);
    return !msg;
  }
  function validateAll() {
    return leads.filter(function (c) { return !validate(c); });
  }

  /* Live feedback: after a field has been visited, re-check it on every change */
  var isLive = function (c) { return c.classList.contains("touched") || f.classList.contains("was-validated"); };
  f.addEventListener("focusout", function (e) {
    var c = e.target;
    if (controls.indexOf(c) === -1 || isGroup(c) || c.type === "checkbox" || c.type === "file") return;
    c.classList.add("touched");
    validate(c);
  });
  f.addEventListener("input", function (e) {
    var c = e.target;
    if (controls.indexOf(c) === -1) return;
    if (c === desc) descCount.textContent = String(desc.value.length);
    if (c === pw && pw2.value) { pw2.classList.add("touched"); validate(pw2); }
    if (c.type === "checkbox" || c.type === "radio" || c.type === "file" || c.tagName === "SELECT") return;
    if (isLive(c)) validate(c);
  });
  f.addEventListener("change", function (e) {
    var c = e.target;
    if (controls.indexOf(c) === -1) return;
    c.classList.add("touched");
    validate(lead(c));
  });

  function showSummary(bad) {
    summary.innerHTML = "";
    summary.appendChild(el("b", "", bad.length === 1 ? "1 field needs your attention:" : bad.length + " fields need your attention:"));
    var ul = el("ul");
    bad.forEach(function (c) {
      var li = el("li"), b = el("button", "", c.validationMessage);
      b.type = "button";
      b.addEventListener("click", function () { c.focus(); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    summary.appendChild(ul);
    summary.hidden = false;
  }

  function clearAll() {
    controls.forEach(function (c) {
      c.setCustomValidity("");
      c.classList.remove("touched", "shake");
      c.removeAttribute("aria-invalid");
    });
    $$("small.error", f).forEach(function (s) { s.textContent = ""; });
    $$(".opts.has-error", f).forEach(function (o) { o.classList.remove("has-error"); });
    f.classList.remove("was-validated");
    summary.hidden = true;
    descCount.textContent = "0";
  }

  /* Clear form button: wipe the messages too, and put today's date back */
  f.addEventListener("reset", function () {
    setTimeout(function () { clearAll(); setDate(); }, 0);
  });

  f.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    done.hidden = true;
    f.classList.add("was-validated");
    var bad = validateAll();

    if (bad.length) {
      showSummary(bad);
      bad.forEach(function (c) {
        restart(c, "shake");
        setTimeout(function () { c.classList.remove("shake"); }, 500);
      });
      bad[0].reportValidity();
      notify("warn", "Please check the form", bad.length + (bad.length === 1 ? " field needs" : " fields need") + " attention.");
      return;
    }

    /* Everything is valid: show the spinner, then the success message */
    summary.hidden = true;
    sending = true;
    var btn = $("[type=submit]", f);
    btn.classList.add("sending");
    var who = $("#name").value.trim().split(/\s+/)[0],
        sev = f.elements.severity.value,
        where = $("#road").value,
        mail = $("#email").value.trim();
    setTimeout(function () {
      var ref = "MT-" + Date.now().toString(36).toUpperCase().slice(-6);
      done.textContent = "Thank you, " + who + ". Your " + sev.toLowerCase() + " report for " + where +
        " was received (reference " + ref + "). We will email " + mail + " with updates.";
      done.hidden = false;
      restart(done, "pop");
      done.scrollIntoView({ block: "center" });
      f.reset();
      sending = false;
      btn.classList.remove("sending");
      btn.classList.add("sent");
      notify("success", "Report received", "The operations centre has been notified.");
      setTimeout(function () { btn.classList.remove("sent"); }, 2600);
    }, 900);
  });

  /* 12. Back-to-top button fades in after scrolling */
  var toTop = $(".totop");
  function onScroll() { toTop.classList.toggle("show", window.scrollY > 400); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 13. A live-update notification a few seconds after load */
  setTimeout(function () {
    notify("warn", "Live update", "Heavy queues are building on Central Avenue.");
  }, 6000);
})();

/* =====================================================================
   INCIDENT BOARD: add, modify, display and remove items with DOM calls
   Uses: getElementById, querySelector, createElement, appendChild, remove,
         innerHTML, textContent, setAttribute, addEventListener
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("incForm");
  if (!form) return;

  var list = document.getElementById("incList");
  var summary = document.getElementById("boardSummary");
  var fTitle = document.getElementById("incTitle");
  var fRoad = document.getElementById("incRoad");
  var fSev = document.getElementById("incSev");
  var fAdj = document.getElementById("incAdj");
  var fNote = document.getElementById("incNote");
  var errTitle = document.getElementById("errTitle");
  var count = document.getElementById("titleCount");
  var formTitle = document.getElementById("formTitle");
  var saveBtn = document.getElementById("incSave");
  var cancelBtn = document.getElementById("incCancel");
  var search = document.getElementById("incSearch");
  var clearBtn = document.getElementById("clearDone");

  var SEV = { high: "Severe", med: "Moderate", low: "Advisory" };
  var TOAST = { high: "danger", med: "warn", low: "info" };
  var DEFAULT_ADJ = { high: ["Urgent", "Blocking"], med: ["Slowing", "Developing"], low: ["Minor", "Planned"] };
  var ROADS_ = window.ROADS || {};
  var editing = null;

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt) n.textContent = txt;
    return n;
  }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
  function say(type, title, text) { if (window.notify) window.notify(type, title, text); }
  function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function roadName(k) { return ROADS_[k] ? ROADS_[k].n : "Other road"; }

  /* Fill the Road drop-down from the map data */
  Object.keys(ROADS_).forEach(function (k) {
    var o = document.createElement("option");
    o.value = k;
    o.textContent = ROADS_[k].n;
    fRoad.appendChild(o);
  });
  var other = document.createElement("option");
  other.value = "other";
  other.textContent = "Other road";
  fRoad.appendChild(other);

  /* Turn "blocking, urgent" into ["Blocking","Urgent"]; suggest words if empty */
  function parseAdj(str, sev) {
    var seen = {}, out = [];
    str.split(/[,;]+/).forEach(function (w) {
      w = w.trim().slice(0, 20);
      if (!w) return;
      w = w.charAt(0).toUpperCase() + w.slice(1);
      var key = w.toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      out.push(w);
    });
    return out.length ? out.slice(0, 4) : DEFAULT_ADJ[sev].slice();
  }

  /* ---- Display: write data into an existing item (also used to modify) ---- */
  function fillItem(li, d) {
    ["high", "med", "low"].forEach(function (s) { li.classList.remove("sev-" + s); });
    li.classList.add("sev-" + d.sev);
    li.classList.toggle("cleared", d.status === "cleared");
    li.dataset.sev = d.sev;
    li.dataset.road = d.road;
    li.dataset.status = d.status;
    li.dataset.time = d.time;

    li.querySelector(".inc-title").textContent = d.title;
    var tag = li.querySelector(".road-tag");
    tag.textContent = roadName(d.road);
    tag.setAttribute("aria-label", "Show " + roadName(d.road) + " on the map");
    if (d.road === "other") tag.setAttribute("disabled", ""); else tag.removeAttribute("disabled");
    li.querySelector(".inc-status").textContent = d.status === "cleared" ? "Cleared" : "Active";

    var note = li.querySelector(".inc-note");
    note.textContent = d.note;
    note.hidden = !d.note;

    var ul = li.querySelector(".adjectives");
    ul.innerHTML = "";
    d.adj.forEach(function (w) { ul.appendChild(el("li", "", w)); });

    li.querySelector(".d-time").textContent = "Logged at " + d.time + " \u00b7 " + SEV[d.sev] + " severity";
    li.querySelector(".d-state").textContent = d.status === "cleared"
      ? "Status: cleared. No further action needed."
      : "Status: active. Operators are monitoring.";
    li.querySelector(".act-resolve").textContent = d.status === "cleared" ? "Reopen" : "Mark cleared";
  }

  /* ---- Add: create every element, then append it ---- */
  function buildItem(d) {
    var li = el("li", "incident");

    var main = el("div", "inc-main");
    var head = el("div", "inc-head");
    head.appendChild(el("strong", "inc-title"));
    var tag = el("button", "road-tag");
    tag.type = "button";
    head.appendChild(tag);
    head.appendChild(el("span", "inc-status"));

    var adj = el("ul", "adjectives");
    adj.setAttribute("aria-label", "Qualities");

    var more = el("div", "more");
    var moreIn = el("div", "more-in");
    moreIn.appendChild(el("p", "d-time"));
    moreIn.appendChild(el("p", "d-state"));
    more.appendChild(moreIn);

    var actions = el("div", "inc-actions");
    var det = el("button", "more-btn");
    det.type = "button";
    det.setAttribute("aria-expanded", "false");
    det.appendChild(el("span", "", "Details"));
    var edit = el("button", "act act-edit", "Edit");
    var res = el("button", "act act-resolve");
    var rem = el("button", "act act-remove", "Remove");
    [edit, res, rem].forEach(function (b) { b.type = "button"; });
    [det, edit, res, rem].forEach(function (b) { actions.appendChild(b); });

    main.appendChild(head);
    main.appendChild(el("p", "inc-note"));
    main.appendChild(adj);
    main.appendChild(more);
    main.appendChild(actions);
    li.appendChild(el("div", "inc-sev"));
    li.appendChild(main);

    fillItem(li, d);
    return li;
  }

  function readItem(li) {
    var note = li.querySelector(".inc-note").textContent;
    var adj = $$(".adjectives li", li).map(function (x) { return x.textContent; });
    return {
      title: li.querySelector(".inc-title").textContent, note: note, adj: adj,
      road: li.dataset.road, sev: li.dataset.sev, status: li.dataset.status, time: li.dataset.time
    };
  }

  /* ---- Summary line and empty state (innerHTML with numbers only) ---- */
  function refresh() {
    var items = $$("li.incident", list);
    var active = 0, severe = 0, cleared = 0, shown = 0;
    items.forEach(function (i) {
      if (i.dataset.status === "active") { active++; if (i.dataset.sev === "high") severe++; } else { cleared++; }
      if (!i.hidden) shown++;
    });
    summary.innerHTML = "<b>" + active + "</b> active &middot; <b>" + severe + "</b> severe &middot; <b>" + cleared + "</b> cleared" +
      (shown !== items.length ? " &middot; showing <b>" + shown + "</b> of " + items.length : "");
    clearBtn.disabled = cleared === 0;

    var empty = list.querySelector(".empty");
    if (!items.length && !empty) {
      empty = el("li", "empty");
      empty.innerHTML = "<p><b>No incidents logged.</b> Use the form to add one.</p>";
      list.appendChild(empty);
    } else if (items.length && empty) {
      empty.remove();
    }
  }

  function applySearch() {
    var q = search.value.trim().toLowerCase();
    $$("li.incident", list).forEach(function (li) {
      var text = [".inc-title", ".road-tag", ".inc-note", ".adjectives"].map(function (s) {
        return li.querySelector(s).textContent;
      }).join(" ").toLowerCase();
      li.hidden = q !== "" && text.indexOf(q) === -1;
    });
    refresh();
  }

  /* ---- Form helpers ---- */
  function showErr(msg) {
    errTitle.textContent = msg;
    fTitle.setAttribute("aria-invalid", "true");
    restart(fTitle, "shake");
    setTimeout(function () { fTitle.classList.remove("shake"); }, 500);
    fTitle.focus();
  }
  function clearErr() {
    errTitle.textContent = "";
    fTitle.removeAttribute("aria-invalid");
  }
  function resetForm() {
    if (editing) editing.classList.remove("editing");
    editing = null;
    form.reset();
    clearErr();
    count.textContent = "0";
    form.classList.remove("editing");
    formTitle.textContent = "Log an incident";
    saveBtn.textContent = "Add incident";
    cancelBtn.setAttribute("hidden", "");
  }
  function flash(li) { restart(li, "flash"); setTimeout(function () { li.classList.remove("flash"); }, 1000); }

  /* ---- Modify: load an item into the form ---- */
  function startEdit(li) {
    if (editing) editing.classList.remove("editing");
    editing = li;
    var d = readItem(li);
    fTitle.value = d.title;
    fRoad.value = d.road;
    fSev.value = d.sev;
    fAdj.value = d.adj.join(", ");
    fNote.value = d.note;
    count.textContent = String(d.title.length);
    clearErr();
    li.classList.add("editing");
    form.classList.add("editing");
    formTitle.textContent = "Edit incident";
    saveBtn.textContent = "Save changes";
    cancelBtn.removeAttribute("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    fTitle.focus();
  }

  function toggleStatus(li) {
    var d = readItem(li);
    d.status = d.status === "active" ? "cleared" : "active";
    fillItem(li, d);
    flash(li);
    if (d.status === "cleared") say("success", "Incident cleared", d.title);
    else say("warn", "Incident reopened", d.title);
    refresh();
  }

  function toggleDetails(li, btn) {
    var open = !li.classList.contains("open");
    li.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.querySelector("span").textContent = open ? "Hide" : "Details";
  }

  /* ---- Remove: play the exit animation, then take the node out of the page ---- */
  function removeItem(li, quiet) {
    if (li.classList.contains("leaving")) return;
    var title = li.querySelector(".inc-title").textContent;
    if (editing === li) resetForm();
    li.classList.add("leaving");
    setTimeout(function () { li.remove(); refresh(); }, 350);
    if (!quiet) say("info", "Incident removed", title);
  }

  /* ---- Events ---- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = fTitle.value.trim();
    if (title.length < 3) { showErr("Enter at least 3 characters describing the incident."); return; }
    clearErr();
    var d = {
      title: title, road: fRoad.value, sev: fSev.value,
      note: fNote.value.trim(), adj: parseAdj(fAdj.value, fSev.value)
    };
    if (editing) {
      var old = readItem(editing);
      d.status = old.status;
      d.time = old.time;
      var li = editing;
      fillItem(li, d);
      flash(li);
      say("success", "Incident updated", title);
      resetForm();
    } else {
      d.status = "active";
      d.time = now();
      var item = buildItem(d);
      list.insertBefore(item, list.firstElementChild);
      say(TOAST[d.sev], SEV[d.sev] + " incident logged", title + " on " + roadName(d.road) + ".");
      resetForm();
      search.value = "";
      applySearch();
    }
    refresh();
  });

  cancelBtn.addEventListener("click", resetForm);

  fTitle.addEventListener("input", function () {
    count.textContent = String(fTitle.value.length);
    if (errTitle.textContent) clearErr();
  });

  document.getElementById("presets").addEventListener("click", function (e) {
    var p = e.target.closest(".preset");
    if (!p) return;
    fTitle.value = p.dataset.title;
    fSev.value = p.dataset.sev;
    fAdj.value = p.dataset.adj;
    fNote.value = p.dataset.note;
    count.textContent = String(fTitle.value.length);
    clearErr();
    fTitle.focus();
  });

  list.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var li = btn.closest("li.incident");
    if (!li) return;
    if (btn.classList.contains("more-btn")) toggleDetails(li, btn);
    else if (btn.classList.contains("act-edit")) startEdit(li);
    else if (btn.classList.contains("act-resolve")) toggleStatus(li);
    else if (btn.classList.contains("act-remove")) removeItem(li);
    else if (btn.classList.contains("road-tag") && window.pick) {
      window.pick(li.dataset.road);
      document.getElementById("map").scrollIntoView();
    }
  });

  clearBtn.addEventListener("click", function () {
    var done = $$('li.incident[data-status="cleared"]', list);
    done.forEach(function (li) { removeItem(li, true); });
    say(done.length ? "success" : "info", done.length ? "Cleared incidents removed" : "Nothing to remove",
      done.length ? done.length + (done.length === 1 ? " incident" : " incidents") + " taken off the board." : "No incidents are marked cleared.");
  });

  search.addEventListener("input", applySearch);

  /* ---- Starting content ---- */
  [
    { title: "Stalled bus on Harbour Road", road: "harbour", sev: "med", status: "active", time: "07:03",
      note: "Tow truck on the way. Left lane blocked.", adj: ["Stationary", "Slowing", "Recoverable"] },
    { title: "Flooded underpass near West Bridge Road", road: "west", sev: "high", status: "active", time: "06:41",
      note: "Standing water across both lanes.", adj: ["Hazardous", "Flooded", "Closed"] },
    { title: "Line painting on East Link", road: "east", sev: "low", status: "active", time: "06:15",
      note: "Cones out from 22:00.", adj: ["Planned", "Overnight", "Minor"] }
  ].forEach(function (d) { list.appendChild(buildItem(d)); });

  refresh();
})();


/* =====================================================================
   LIVE NETWORK DATA: fetch JSON from an API and show it on the page
   Uses: fetch, async, await, response.json, try, catch, finally,
         createElement, appendChild, textContent
   ===================================================================== */
(function () {
  "use strict";

  var section = document.getElementById("feed");
  if (!section) return;

  /* ---- Settings ---- */
  var API_URL = "https://api.open-meteo.com/v1/forecast";
  var TIMEOUT_MS = 10000;          /* give up after 10 seconds */
  var REFRESH_MS = 5 * 60 * 1000;  /* automatic refresh every 5 minutes */
  var HUBS = [
    { name: "Chennai",   region: "Tamil Nadu",  lat: 13.0827, lon: 80.2707 },
    { name: "Mumbai",    region: "Maharashtra", lat: 19.0760, lon: 72.8777 },
    { name: "Delhi",     region: "Delhi NCR",   lat: 28.6139, lon: 77.2090 },
    { name: "Bengaluru", region: "Karnataka",   lat: 12.9716, lon: 77.5946 },
    { name: "Hyderabad", region: "Telangana",   lat: 17.3850, lon: 78.4867 },
    { name: "Kolkata",   region: "West Bengal", lat: 22.5726, lon: 88.3639 }
  ];

  /* ---- Page elements ---- */
  var loader = document.getElementById("feedLoader");
  var errorBox = document.getElementById("feedError");
  var errorText = document.getElementById("feedErrorText");
  var summary = document.getElementById("feedSummary");
  var wrap = document.getElementById("feedTable");
  var body = document.getElementById("feedBody");
  var statusLine = document.getElementById("feedStatus");
  var refreshBtn = document.getElementById("feedRefresh");
  var retryBtn = document.getElementById("feedRetry");

  var busy = false;
  var hasData = false;

  /* ---- Small helpers ---- */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined && txt !== null) n.textContent = txt;
    return n;
  }
  function show(node, on) { node.hidden = !on; }
  function say(type, title, text) { if (window.notify) window.notify(type, title, text); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function clock() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  /* ---- Describing words: the first table row that the value is below wins ---- */
  var RAIN = [[0.1, "Dry"], [1, "Damp"], [5, "Wet"], [Infinity, "Flood-prone"]];
  var WIND = [[15, "Calm"], [30, "Breezy"], [50, "Gusty"], [Infinity, "Stormy"]];
  var VIS  = [[1, "Foggy"], [5, "Misty"], [10, "Hazy"], [Infinity, "Clear"]];
  var TEMP = [[15, "Cool"], [22, "Mild"], [30, "Warm"], [35, "Hot"], [Infinity, "Sweltering"]];
  function word(value, table) {
    for (var i = 0; i < table.length; i++) { if (value < table[i][0]) return table[i][1]; }
    return table[table.length - 1][1];
  }

  /* Weather code (WMO) to plain English */
  var CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Freezing fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"
  };

  var STATUS = {
    free:  { label: "Favourable", cls: "free" },
    mod:   { label: "Cautious",   cls: "mod" },
    heavy: { label: "Hazardous",  cls: "heavy" }
  };

  /* Work out how safe the roads are and which adjectives describe them */
  function assess(r) {
    var level = "free";
    var hasVis = isNum(r.vis);
    if (r.rain >= 2.5 || (hasVis && r.vis < 1) || r.wind >= 50 || r.code >= 95 || r.code === 65 || r.code === 82) {
      level = "heavy";
    } else if (r.rain >= 0.2 || (hasVis && r.vis < 5) || r.wind >= 30 ||
               r.code === 45 || r.code === 48 || (r.code >= 51 && r.code <= 67) || r.code === 81) {
      level = "mod";
    }
    var adj = [word(r.rain, RAIN), word(r.wind, WIND)];
    if (hasVis) adj.unshift(word(r.vis, VIS));
    adj.push(word(r.temp, TEMP));
    return { level: level, adj: adj };
  }

  /* ---- Request ---- */
  function buildUrl() {
    var lat = HUBS.map(function (h) { return h.lat; }).join(",");
    var lon = HUBS.map(function (h) { return h.lon; }).join(",");
    return API_URL + "?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,precipitation,wind_speed_10m,visibility,weather_code" +
      "&timezone=Asia%2FKolkata";
  }

  /* Turn the raw JSON into a clean list of rows (one per hub) */
  function normalise(data) {
    if (data && data.error) throw new Error(data.reason || "The data service reported an error.");
    var list = Array.isArray(data) ? data : [data];
    return list.map(function (item, i) {
      var c = item && item.current;
      if (!c || !isNum(c.temperature_2m)) return null;
      var hub = HUBS[i] || { name: "Hub " + (i + 1), region: "" };
      var row = {
        name: hub.name,
        region: hub.region,
        temp: c.temperature_2m,
        rain: isNum(c.precipitation) ? c.precipitation : 0,
        wind: isNum(c.wind_speed_10m) ? c.wind_speed_10m : 0,
        vis: isNum(c.visibility) ? c.visibility / 1000 : null,   /* metres to km */
        code: isNum(c.weather_code) ? c.weather_code : 0
      };
      row.info = assess(row);
      return row;
    }).filter(Boolean);
  }

  /* ---- Display ---- */
  function card(value, label, note) {
    var d = el("div");
    d.appendChild(el("b", "", value));
    d.appendChild(el("span", "", label));
    if (note) d.appendChild(el("small", "", note));
    return d;
  }

  function renderSummary(rows) {
    var caution = rows.filter(function (r) { return r.info.level !== "free"; }).length;
    var windiest = rows.reduce(function (a, b) { return b.wind > a.wind ? b : a; });
    var withVis = rows.filter(function (r) { return r.vis !== null; });
    var murkiest = withVis.length ? withVis.reduce(function (a, b) { return b.vis < a.vis ? b : a; }) : null;
    var avg = rows.reduce(function (s, r) { return s + r.temp; }, 0) / rows.length;

    summary.textContent = "";
    summary.appendChild(card(String(rows.length), "Hubs reporting"));
    summary.appendChild(card(String(caution), "Need extra care", caution ? "Rain, wind or low visibility" : "All roads favourable"));
    summary.appendChild(card(windiest.wind.toFixed(0) + " km/h", "Strongest wind", windiest.name));
    summary.appendChild(murkiest
      ? card(murkiest.vis.toFixed(1) + " km", "Lowest visibility", murkiest.name)
      : card(avg.toFixed(1) + " \u00b0C", "Average temperature"));
  }

  function renderTable(rows) {
    body.textContent = "";
    rows.forEach(function (r) {
      var tr = el("tr");

      var hub = el("td");
      hub.appendChild(el("b", "", r.name));
      hub.appendChild(el("small", "", (r.region ? r.region + " \u00b7 " : "") + (CODES[r.code] || "Unknown")));
      tr.appendChild(hub);

      tr.appendChild(el("td", "", r.temp.toFixed(1) + " \u00b0C"));
      tr.appendChild(el("td", "", r.rain.toFixed(1) + " mm"));
      tr.appendChild(el("td", "", r.wind.toFixed(0) + " km/h"));
      tr.appendChild(el("td", "", r.vis === null ? "n/a" : r.vis.toFixed(1) + " km"));

      var st = el("td");
      var s = STATUS[r.info.level];
      st.appendChild(el("span", "pill " + s.cls, s.label));
      tr.appendChild(st);

      var tags = el("td");
      var ul = el("ul", "adjectives");
      ul.setAttribute("aria-label", "Conditions at " + r.name);
      r.info.adj.forEach(function (w) { ul.appendChild(el("li", "", w)); });
      tags.appendChild(ul);
      tr.appendChild(tags);

      body.appendChild(tr);
    });
  }

  /* Show only the parts that belong to the current state */
  function setState(state) {
    var loading = state === "loading";
    show(loader, loading && !hasData);
    show(errorBox, state === "error");
    show(summary, hasData);
    show(wrap, hasData);
    wrap.classList.toggle("is-busy", loading);
    refreshBtn.disabled = loading;
    refreshBtn.textContent = loading ? "Loading\u2026" : "Refresh data";
    section.setAttribute("aria-busy", loading ? "true" : "false");
  }

  /* Friendly, specific error messages */
  function describe(err) {
    if (err && err.name === "AbortError") return "The data service took too long to respond.";
    if (err && err.name === "TypeError") return "We could not reach the data service. Check your internet connection.";
    if (err && err.status === 429) return "Too many requests were sent. Please wait a minute and try again.";
    if (err && err.status >= 500) return "The data service is having problems right now.";
    return (err && err.message) || "Something unexpected went wrong.";
  }

  /* ---- Load: fetch, check, parse, display ---- */
  async function loadFeed(manual) {
    if (busy) return;
    busy = true;
    statusLine.textContent = "Loading live data\u2026";
    setState("loading");

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    try {
      var response = await fetch(buildUrl(), {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        var bad = new Error("The data service answered with status " + response.status + ".");
        bad.status = response.status;
        throw bad;
      }

      var data = await response.json();
      var rows = normalise(data);
      if (!rows.length) throw new Error("The data service returned no readings.");

      renderSummary(rows);
      renderTable(rows);
      hasData = true;
      setState("ready");
      statusLine.textContent = "Updated at " + clock() + " \u00b7 " + rows.length + " hubs";
      if (manual) say("success", "Live data updated", rows.length + " hubs are reporting.");
    } catch (err) {
      var msg = describe(err);
      errorText.textContent = msg + (hasData ? " Showing the last data received." : "");
      setState("error");
      statusLine.textContent = "Last attempt failed at " + clock();
      say("danger", "Live data unavailable", msg);
    } finally {
      /* Always runs: stop the timer, hide the loader, unlock the button */
      clearTimeout(timer);
      busy = false;
      show(loader, false);
      wrap.classList.remove("is-busy");
      refreshBtn.disabled = false;
      refreshBtn.textContent = "Refresh data";
      section.setAttribute("aria-busy", "false");
    }
  }

  refreshBtn.addEventListener("click", function () { loadFeed(true); });
  retryBtn.addEventListener("click", function () { loadFeed(true); });
  setInterval(function () { if (!document.hidden) loadFeed(false); }, REFRESH_MS);
  loadFeed(false);
})();

/* =====================================================================
   OPERATIONS TASK MANAGER: Create, Read, Update, Delete with Local Storage
   Uses: addEventListener, createElement, appendChild, remove, push, filter,
         find, localStorage.setItem, localStorage.getItem,
         JSON.stringify, JSON.parse
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("taskForm");
  if (!form) return;

  var STORE_KEY = "meridian.tasks.v1";
  var PRIORITY = { high: "High", med: "Medium", low: "Low" };
  var PILL = { high: "heavy", med: "mod", low: "free" };
  var STATUS = { todo: "To do", progress: "In progress", done: "Done" };

  var fTitle = document.getElementById("taskTitle");
  var fTeam = document.getElementById("taskTeam");
  var fRoad = document.getElementById("taskRoad");
  var fPri = document.getElementById("taskPriority");
  var fDue = document.getElementById("taskDue");
  var fStatus = document.getElementById("taskStatus");
  var fDesc = document.getElementById("taskDesc");
  var errTitle = document.getElementById("errTaskTitle");
  var formTitle = document.getElementById("taskFormTitle");
  var saveBtn = document.getElementById("taskSave");
  var cancelBtn = document.getElementById("taskCancel");
  var body = document.getElementById("taskBody");
  var search = document.getElementById("taskSearch");
  var filterSel = document.getElementById("taskFilter");
  var clearBtn = document.getElementById("taskClearDone");

  var tasks = [];
  var editingId = null;

  function say(type, title, text) { if (window.notify) window.notify(type, title, text); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function newId() { return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function roadName(k) {
    var R = window.ROADS || {};
    return R[k] ? R[k].n : "Citywide";
  }
  function niceDate(s) {
    if (!s) return "No date";
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString([], { day: "numeric", month: "short" });
  }
  function cell(text, cls) {
    var td = document.createElement("td");
    if (cls) td.className = cls;
    if (text !== undefined) td.textContent = text;
    return td;
  }
  function btn(label, cls) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = label;
    return b;
  }

  /* ---- Local Storage: read and write the whole list as JSON ---- */
  function loadTasks() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (err) { return null; }
    if (raw === null) return null;            /* never saved before */
    try {
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }            /* corrupted value: start fresh */
  }
  function saveTasks() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }
    catch (err) { say("warn", "Not saved", "This browser blocked storage, so changes will be lost on refresh."); }
  }

  /* ---- Fill the Road drop-down from the map data ---- */
  Object.keys(window.ROADS || {}).forEach(function (k) {
    var o = document.createElement("option");
    o.value = k;
    o.textContent = window.ROADS[k].n;
    fRoad.appendChild(o);
  });
  var city = document.createElement("option");
  city.value = "city";
  city.textContent = "Citywide";
  fRoad.appendChild(city);

  /* ---- READ: build the table from the (filtered) list ---- */
  function visibleTasks() {
    var q = search.value.trim().toLowerCase();
    var f = filterSel.value;
    return tasks.filter(function (t) {
      if (f !== "all" && t.status !== f) return false;
      if (!q) return true;
      return (t.title + " " + t.team + " " + roadName(t.road) + " " + t.desc).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
      return (a.due || "9999").localeCompare(b.due || "9999");
    });
  }

  function buildRow(t) {
    var tr = document.createElement("tr");
    tr.dataset.id = t.id;
    var late = t.due && t.due < today() && t.status !== "done";
    if (t.status === "done") tr.classList.add("is-done");
    if (t.id === editingId) tr.classList.add("editing");

    var main = cell();
    var name = document.createElement("b");
    name.textContent = t.title;
    main.appendChild(name);
    if (late) {
      var tag = document.createElement("span");
      tag.className = "overdue";
      tag.textContent = "Overdue";
      main.appendChild(tag);
    }
    if (t.desc) {
      var small = document.createElement("small");
      small.textContent = t.desc;
      main.appendChild(small);
    }
    tr.appendChild(main);
    tr.appendChild(cell(t.team));
    tr.appendChild(cell(roadName(t.road)));

    var pri = cell();
    var pill = document.createElement("span");
    pill.className = "pill " + PILL[t.priority];
    pill.textContent = PRIORITY[t.priority];
    pri.appendChild(pill);
    tr.appendChild(pri);

    tr.appendChild(cell(niceDate(t.due), late ? "due-late" : ""));

    /* UPDATE (status): a drop-down right in the row */
    var st = cell();
    var sel = document.createElement("select");
    sel.className = "tm-status";
    sel.dataset.s = t.status;
    sel.setAttribute("aria-label", "Status of " + t.title);
    Object.keys(STATUS).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = STATUS[k];
      if (k === t.status) o.selected = true;
      sel.appendChild(o);
    });
    st.appendChild(sel);
    tr.appendChild(st);

    var act = cell();
    var box = document.createElement("div");
    box.className = "tm-actions";
    box.appendChild(btn("Edit", "act act-edit"));
    box.appendChild(btn("Delete", "act act-remove"));
    act.appendChild(box);
    tr.appendChild(act);
    return tr;
  }

  function render() {
    body.textContent = "";
    var rows = visibleTasks();
    rows.forEach(function (t) { body.appendChild(buildRow(t)); });
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.className = "tm-empty";
      var td = cell(tasks.length ? "No tasks match your search or filter." : "No tasks yet. Use the form to create your first one.");
      td.colSpan = 7;
      tr.appendChild(td);
      body.appendChild(tr);
    }
    var count = function (s) { return tasks.filter(function (t) { return t.status === s; }).length; };
    document.getElementById("stTotal").textContent = String(tasks.length);
    document.getElementById("stTodo").textContent = String(count("todo"));
    document.getElementById("stProgress").textContent = String(count("progress"));
    document.getElementById("stDone").textContent = String(count("done"));
    clearBtn.disabled = count("done") === 0;
  }

  function flashRow(id) {
    var tr = body.querySelector('tr[data-id="' + id + '"]');
    if (!tr) return;
    tr.classList.add("flash");
    setTimeout(function () { tr.classList.remove("flash"); }, 1000);
  }

  /* ---- Form helpers ---- */
  function showErr(msg) {
    errTitle.textContent = msg;
    fTitle.setAttribute("aria-invalid", "true");
    fTitle.focus();
  }
  function clearErr() {
    errTitle.textContent = "";
    fTitle.removeAttribute("aria-invalid");
  }
  function resetForm() {
    editingId = null;
    form.reset();
    clearErr();
    form.classList.remove("editing");
    formTitle.textContent = "Create a task";
    saveBtn.textContent = "Add task";
    cancelBtn.hidden = true;
    render();
  }

  /* ---- CREATE and UPDATE: one form handles both ---- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = fTitle.value.trim();
    if (title.length < 3) { showErr("Enter at least 3 characters for the task name."); return; }
    clearErr();

    var values = {
      title: title, team: fTeam.value, road: fRoad.value, priority: fPri.value,
      due: fDue.value, status: fStatus.value, desc: fDesc.value.trim()
    };

    if (editingId) {
      var t = tasks.find(function (x) { return x.id === editingId; });
      if (t) {
        Object.keys(values).forEach(function (k) { t[k] = values[k]; });
        saveTasks();
        var id = editingId;
        resetForm();
        flashRow(id);
        say("success", "Task updated", title);
      }
    } else {
      values.id = newId();
      values.created = Date.now();
      tasks.push(values);
      saveTasks();
      resetForm();
      flashRow(values.id);
      say("success", "Task created", title);
    }
  });

  cancelBtn.addEventListener("click", resetForm);
  fTitle.addEventListener("input", clearErr);
  search.addEventListener("input", render);
  filterSel.addEventListener("change", render);

  /* ---- Row events (edit, delete, status) ---- */
  function startEdit(t) {
    editingId = t.id;
    fTitle.value = t.title;
    fTeam.value = t.team;
    fRoad.value = t.road;
    fPri.value = t.priority;
    fDue.value = t.due;
    fStatus.value = t.status;
    fDesc.value = t.desc;
    clearErr();
    form.classList.add("editing");
    formTitle.textContent = "Edit task";
    saveBtn.textContent = "Save changes";
    cancelBtn.hidden = false;
    render();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    fTitle.focus();
  }

  /* DELETE: filter the task out of the array, animate the row, then remove() it */
  function deleteTask(id, tr) {
    var gone = tasks.find(function (x) { return x.id === id; });
    tasks = tasks.filter(function (x) { return x.id !== id; });
    saveTasks();
    if (editingId === id) resetForm();
    tr.classList.add("leaving");
    setTimeout(function () { tr.remove(); render(); }, 300);
    if (gone) say("info", "Task deleted", gone.title);
  }

  body.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    var tr = e.target.closest("tr[data-id]");
    if (!b || !tr) return;
    var id = tr.dataset.id;
    if (b.classList.contains("act-edit")) {
      var t = tasks.find(function (x) { return x.id === id; });
      if (t) startEdit(t);
    } else if (b.classList.contains("act-remove")) {
      /* two clicks to delete, so a stray tap never wipes a task */
      if (b.classList.contains("confirm")) { deleteTask(id, tr); return; }
      b.classList.add("confirm");
      b.textContent = "Sure?";
      setTimeout(function () {
        if (b.isConnected) { b.classList.remove("confirm"); b.textContent = "Delete"; }
      }, 3000);
    }
  });

  body.addEventListener("change", function (e) {
    var sel = e.target.closest(".tm-status");
    if (!sel) return;
    var id = sel.closest("tr").dataset.id;
    var t = tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    t.status = sel.value;
    saveTasks();
    render();
    flashRow(id);
    say(t.status === "done" ? "success" : "info", "Status: " + STATUS[t.status], t.title);
  });

  clearBtn.addEventListener("click", function () {
    var n = tasks.filter(function (t) { return t.status === "done"; }).length;
    tasks = tasks.filter(function (t) { return t.status !== "done"; });
    saveTasks();
    if (editingId && !tasks.find(function (t) { return t.id === editingId; })) { resetForm(); } else { render(); }
    say(n ? "success" : "info", n ? "Completed tasks cleared" : "Nothing to clear",
      n ? n + (n === 1 ? " task" : " tasks") + " removed." : "No tasks are marked done.");
  });

  /* ---- Start: load saved tasks, or seed a few examples the first time ---- */
  var saved = loadTasks();
  if (saved) {
    tasks = saved;
  } else {
    tasks.push({ id: newId(), title: "Replace signal controller at Main St and Central Ave", team: "Signal maintenance", road: "main", priority: "high", due: plusDays(1), status: "progress", desc: "Junction is on backup timing until the new unit is fitted.", created: Date.now() });
    tasks.push({ id: newId(), title: "Send patrol to the fog zone on Harbour Road", team: "Field patrol", road: "harbour", priority: "med", due: today(), status: "todo", desc: "Check visibility and update the variable message sign.", created: Date.now() });
    tasks.push({ id: newId(), title: "Pump out flooded underpass near West Bridge Road", team: "Emergency response", road: "west", priority: "high", due: plusDays(-1), status: "todo", desc: "Standing water across both lanes.", created: Date.now() });
    tasks.push({ id: newId(), title: "Calibrate in-road sensors on North Ring", team: "Signal maintenance", road: "north", priority: "low", due: plusDays(5), status: "done", desc: "", created: Date.now() });
    saveTasks();
  }
  render();
})();

/* =====================================================================
   TECHNOLOGY EXPLORER: search, filter, sort and compare
   Uses: addEventListener, querySelector(All), classList.toggle/add/remove,
   filter(), forEach(), find()
   ===================================================================== */
(function () {
  var root = document.querySelector("#explorer");
  if (!root) return;

  var $ = function (s) { return root.querySelector(s); };
  var $$ = function (s) { return root.querySelectorAll(s); };
  var say = function (type, title, text) { if (window.notify) window.notify(type, title, text); };

  var COST = ["", "Low", "Medium", "High"];
  var MAX_PICKS = 3;

  /* Simple illustrations, drawn as inline SVG and used as <img> sources */
  var ART = {
    loop: '<rect x="130" y="120" width="140" height="70" rx="8" fill="none" stroke="#fff" stroke-width="6"/><rect x="165" y="138" width="70" height="34" rx="10" fill="#fff"/>',
    radar: '<circle cx="200" cy="170" r="30" fill="#fff"/><path d="M130 150a85 85 0 0 1 140 0M105 128a120 120 0 0 1 190 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
    camera: '<rect x="90" y="60" width="220" height="14" rx="5" fill="#fff"/><rect x="165" y="74" width="70" height="44" rx="10" fill="#fff"/><circle cx="200" cy="96" r="12" fill="#14213d"/><path d="M200 120L140 200h120z" fill="#fff" opacity=".3"/>',
    signal: '<rect x="165" y="40" width="70" height="130" rx="14" fill="#fff"/><circle cx="200" cy="68" r="15" fill="#d64545"/><circle cx="200" cy="105" r="15" fill="#d99a00"/><circle cx="200" cy="142" r="15" fill="#1f9d55"/><rect x="192" y="170" width="16" height="40" fill="#fff"/>',
    bus: '<rect x="90" y="100" width="220" height="70" rx="14" fill="#fff"/><rect x="110" y="114" width="40" height="26" rx="4" fill="#14213d"/><rect x="160" y="114" width="40" height="26" rx="4" fill="#14213d"/><rect x="210" y="114" width="40" height="26" rx="4" fill="#14213d"/><circle cx="140" cy="172" r="14" fill="#14213d" stroke="#fff" stroke-width="4"/><circle cx="260" cy="172" r="14" fill="#14213d" stroke="#fff" stroke-width="4"/>',
    sign: '<rect x="70" y="60" width="260" height="100" rx="12" fill="#fff"/><rect x="92" y="82" width="120" height="10" rx="3" fill="#14213d"/><rect x="92" y="104" width="170" height="10" rx="3" fill="#14213d"/><rect x="92" y="126" width="90" height="10" rx="3" fill="#14213d"/><path d="M290 84l22 40h-44z" fill="#d64545"/><rect x="110" y="160" width="12" height="50" fill="#fff"/><rect x="278" y="160" width="12" height="50" fill="#fff"/>',
    weather: '<circle cx="165" cy="110" r="30" fill="#fff"/><rect x="150" y="105" width="130" height="50" rx="25" fill="#fff"/><path d="M175 175l-8 22M205 175l-8 22M235 175l-8 22" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
    ai: '<rect x="110" y="70" width="180" height="120" rx="12" fill="none" stroke="#fff" stroke-width="6"/><polyline points="130,165 165,120 200,145 245,95 270,110" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function picture(key, color) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="' + color + '"/><rect y="200" width="400" height="40" fill="#000" opacity=".18"/>' + ART[key] + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  var TECH = [
    { id: "loop", art: "loop", name: "Inductive loop sensor", cat: "Sensing", cost: 1, accuracy: 95, install: 3, life: 10, color: "#0b5fff",
      blurb: "Wire loops under the road count vehicles and measure their speed.",
      specs: ["Counts every vehicle that passes", "Works day and night, in any weather", "Needs a short lane closure to install"],
      adj: ["Precise", "Durable", "Embedded", "Reliable"] },
    { id: "radar", art: "radar", name: "Radar detector", cat: "Sensing", cost: 2, accuracy: 92, install: 1, life: 8, color: "#1f7a8c",
      blurb: "A roadside unit that tracks speed and queue length without touching the road.",
      specs: ["Covers several lanes at once", "Mounts on an existing pole", "No road works needed"],
      adj: ["Non-intrusive", "Accurate", "Weather-proof", "Real-time"] },
    { id: "gantry", art: "camera", name: "Gantry camera", cat: "Cameras", cost: 3, accuracy: 97, install: 5, life: 7, color: "#14213d",
      blurb: "A high-resolution camera that watches the carriageway and flags stopped vehicles.",
      specs: ["Detects incidents in about 38 seconds", "Feeds the control room wall", "Records footage for review"],
      adj: ["Vigilant", "Automated", "High-resolution", "Real-time"] },
    { id: "ai", art: "ai", name: "AI incident detection", cat: "Cameras", cost: 2, accuracy: 94, install: 2, life: 5, color: "#5b3fd1",
      blurb: "Software that reads existing camera feeds and raises an alert when something looks wrong.",
      specs: ["Runs on cameras you already own", "Learns what normal traffic looks like", "Sends alerts to operators"],
      adj: ["Smart", "Automated", "Scalable", "Fast"] },
    { id: "adaptive", art: "signal", name: "Adaptive signal controller", cat: "Signals", cost: 3, accuracy: 90, install: 7, life: 12, color: "#1f9d55",
      blurb: "Lengthens green time where cars are queuing and shortens it where roads are empty.",
      specs: ["Updates timing every few seconds", "Cuts average waits at busy junctions", "Falls back to fixed timing if sensors fail"],
      adj: ["Adaptive", "Efficient", "Responsive", "Reliable"] },
    { id: "priority", art: "bus", name: "Bus priority system", cat: "Signals", cost: 2, accuracy: 88, install: 4, life: 10, color: "#0b7285",
      blurb: "Gives approaching buses an early green so timetables hold in busy corridors.",
      specs: ["Detects buses by on-board tag", "Limits delay to other traffic", "Reports punctuality to operators"],
      adj: ["Punctual", "Sustainable", "Efficient", "Dependable"] },
    { id: "vms", art: "sign", name: "Variable message sign", cat: "Information", cost: 2, accuracy: 85, install: 4, life: 15, color: "#b26a00",
      blurb: "A roadside sign that shows hazards, detours and journey times as soon as operators publish them.",
      specs: ["Updates within seconds", "Readable in bright sun and fog", "Controlled from the operations centre"],
      adj: ["Clear", "Instant", "Visible", "Durable"] },
    { id: "weather", art: "weather", name: "Road weather station", cat: "Information", cost: 1, accuracy: 93, install: 2, life: 9, color: "#3a6ea5",
      blurb: "Measures rain, wind, fog and surface temperature so signs and speed limits can respond.",
      specs: ["Warns of ice and standing water", "Triggers lower speed limits", "Shares readings with the live data feed"],
      adj: ["Weather-aware", "Precise", "Reliable", "Real-time"] }
  ];

  var state = { q: "", cat: "all", cost: 3, sort: "name", adj: [], picked: [] };

  /* ---- Quality chips: adjectives that appear on more than one technology ---- */
  var counts = {};
  TECH.forEach(function (t) { t.adj.forEach(function (a) { counts[a] = (counts[a] || 0) + 1; }); });
  var chipWords = Object.keys(counts).filter(function (a) { return counts[a] > 1; })
    .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });

  $("#exChips").innerHTML = chipWords.map(function (a) {
    return '<button type="button" class="chip" data-adj="' + a + '" aria-pressed="false">' + a + "</button>";
  }).join("");

  $$("#exChips .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var word = chip.dataset.adj;
      var on = state.adj.indexOf(word) === -1;
      state.adj = on ? state.adj.concat(word) : state.adj.filter(function (a) { return a !== word; });
      chip.classList.toggle("on", on);
      chip.setAttribute("aria-pressed", on);
      draw();
    });
  });

  /* ---- Filtering and sorting ---- */
  function visible() {
    var q = state.q.trim().toLowerCase();
    var list = TECH.filter(function (t) {
      var text = (t.name + " " + t.blurb + " " + t.cat + " " + t.adj.join(" ")).toLowerCase();
      return (!q || text.indexOf(q) > -1) &&
        (state.cat === "all" || t.cat === state.cat) &&
        t.cost <= state.cost &&
        state.adj.every(function (a) { return t.adj.indexOf(a) > -1; });
    });
    var by = {
      name: function (a, b) { return a.name.localeCompare(b.name); },
      accuracy: function (a, b) { return b.accuracy - a.accuracy; },
      cost: function (a, b) { return a.cost - b.cost || a.name.localeCompare(b.name); },
      install: function (a, b) { return a.install - b.install; }
    };
    return list.sort(by[state.sort]);
  }

  /* ---- Cards ---- */
  function card(t) {
    return '<li class="ex-card" data-id="' + t.id + '">' +
      '<div class="ex-media"><img src="' + picture(t.art, t.color) + '" alt="Illustration of ' + t.name.toLowerCase() + '" width="400" height="240" loading="lazy"><span class="ex-cat">' + t.cat + "</span></div>" +
      '<div class="ex-body"><h3>' + t.name + "</h3>" +
      '<ul class="adjectives" aria-label="Qualities">' + t.adj.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>" +
      "<p>" + t.blurb + "</p>" +
      '<div class="ex-meta"><span>Cost <b>' + COST[t.cost] + "</b></span><span>Accuracy <b>" + t.accuracy + "%</b></span><span>Install <b>" + t.install + (t.install === 1 ? " day" : " days") + "</b></span></div>" +
      "<details><summary>Specifications</summary><ul class=\"ex-specs\">" + t.specs.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul></details>" +
      '<button type="button" class="ex-pick" aria-pressed="false">Add to compare</button></div></li>';
  }

  function draw() {
    var list = visible();
    var grid = $("#exGrid");
    grid.innerHTML = list.length ? list.map(card).join("") :
      '<li class="ex-empty"><p>No technology matches these filters. Remove a quality or search for something else.</p><button type="button" class="preset" id="exEmptyReset">Reset filters</button></li>';

    $("#exCount").textContent = list.length + (list.length === 1 ? " technology" : " technologies") + " shown";

    $$(".ex-card").forEach(function (el, i) {
      var id = el.dataset.id;
      el.querySelector(".ex-pick").addEventListener("click", function () { toggle(id); });
      el.querySelector("details").addEventListener("toggle", function (e) { el.classList.toggle("open", e.target.open); });
      setTimeout(function () { el.classList.add("in"); }, 30 + i * 40);
    });
    var again = $("#exEmptyReset");
    if (again) again.addEventListener("click", reset);
    sync();
  }

  /* ---- Compare ---- */
  function toggle(id) {
    var at = state.picked.indexOf(id);
    if (at > -1) {
      state.picked.splice(at, 1);
    } else if (state.picked.length >= MAX_PICKS) {
      say("warn", "Comparison is full", "Remove one technology to add another. You can compare up to " + MAX_PICKS + ".");
      return;
    } else {
      state.picked.push(id);
    }
    sync();
  }

  function sync() {
    $$(".ex-card").forEach(function (el) {
      var on = state.picked.indexOf(el.dataset.id) > -1;
      var btn = el.querySelector(".ex-pick");
      el.classList.toggle("selected", on);
      btn.setAttribute("aria-pressed", on);
      btn.textContent = on ? "Remove from compare" : "Add to compare";
    });
    compare();
  }

  function compare() {
    var box = $("#exCompare");
    var items = state.picked.map(function (id) { return TECH.find(function (t) { return t.id === id; }); });

    var chosen = items.length ? '<ul class="ex-picked" aria-label="Selected technologies">' + items.map(function (t) {
      return '<li>' + t.name + '<button type="button" data-id="' + t.id + '" aria-label="Remove ' + t.name + ' from comparison">&times;</button></li>';
    }).join("") + "</ul>" : "";

    var head = "<h3>Compare side by side</h3>";
    if (items.length < 2) {
      box.innerHTML = head + "<p>" + (items.length ? "Add one more technology to start comparing." : "Choose two or three technologies above. Their cost, accuracy and install time will appear here.") + "</p>" + chosen;
    } else {
      var best = function (key, dir) {
        var vals = items.map(function (t) { return t[key]; });
        return dir === "max" ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
      };
      var rows = [
        { label: "Category", cell: function (t) { return t.cat; } },
        { label: "Cost", key: "cost", dir: "min", cell: function (t) { return COST[t.cost]; } },
        { label: "Accuracy", key: "accuracy", dir: "max", cell: function (t) { return t.accuracy + "%"; } },
        { label: "Install time", key: "install", dir: "min", cell: function (t) { return t.install + (t.install === 1 ? " day" : " days"); } },
        { label: "Lifespan", key: "life", dir: "max", cell: function (t) { return t.life + " years"; } },
        { label: "Qualities", cell: function (t) { return '<ul class="adjectives" aria-label="Qualities">' + t.adj.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>"; } }
      ];
      box.innerHTML = head + chosen + '<div class="tablewrap"><table><thead><tr><th scope="col">Feature</th>' +
        items.map(function (t) { return '<th scope="col">' + t.name + "</th>"; }).join("") + "</tr></thead><tbody>" +
        rows.map(function (r) {
          return '<tr><th scope="row">' + r.label + "</th>" + items.map(function (t) {
            var win = r.key && t[r.key] === best(r.key, r.dir) && items.some(function (o) { return o[r.key] !== t[r.key]; });
            return "<td" + (win ? ' class="best"' : "") + ">" + r.cell(t) + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table></div><p>A tick marks the best value in each row.</p>";
    }

    box.querySelectorAll(".ex-picked button").forEach(function (b) {
      b.addEventListener("click", function () { toggle(b.dataset.id); });
    });
  }

  /* ---- Controls ---- */
  $("#exSearch").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
  $("#exSearch").addEventListener("keydown", function (e) {
    if (e.key === "Escape" && e.target.value) { e.target.value = ""; state.q = ""; draw(); }
  });
  $("#exCat").addEventListener("change", function (e) { state.cat = e.target.value; draw(); });
  $("#exCost").addEventListener("change", function (e) { state.cost = +e.target.value; draw(); });
  $("#exSort").addEventListener("change", function (e) { state.sort = e.target.value; draw(); });

  function reset() {
    state.q = ""; state.cat = "all"; state.cost = 3; state.sort = "name"; state.adj = [];
    $("#exSearch").value = ""; $("#exCat").value = "all"; $("#exCost").value = "3"; $("#exSort").value = "name";
    $$("#exChips .chip").forEach(function (c) { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
    draw();
  }
  $("#exReset").addEventListener("click", reset);

  draw();
})();