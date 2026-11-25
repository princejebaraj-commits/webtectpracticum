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
    var b = e.target.closest(".chip,.go,.btns button,.seg button,.route,.more-btn,.menu-toggle");
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