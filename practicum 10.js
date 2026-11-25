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
    var hit = e.target.closest(".info-btn,.overlay,img");
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

  /* 11. Report form: shake invalid fields, spinner, confirmation */
  var f = $("#repForm"), warnTimer = null;
  f.addEventListener("invalid", function (e) {
    var t = e.target;
    restart(t, "shake");
    setTimeout(function () { t.classList.remove("shake"); }, 500);
    if (!warnTimer) {
      notify("warn", "Please check the form", "Some required details are missing or invalid.");
      warnTimer = setTimeout(function () { warnTimer = null; }, 4000);
    }
  }, true);
  f.addEventListener("submit", function () {
    var btn = $("[type=submit]", f);
    restart($("#done"), "pop");
    btn.classList.add("sending");
    setTimeout(function () {
      btn.classList.remove("sending");
      btn.classList.add("sent");
      notify("success", "Report received", "The operations centre has been notified.");
    }, 900);
    setTimeout(function () { btn.classList.remove("sent"); }, 2600);
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