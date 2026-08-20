/* M20 Technology — site interactions */
(function () {
  "use strict";

  /* Footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Header shadow on scroll */
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Nav dropdowns */
  document.querySelectorAll(".has-dropdown").forEach(function (dd) {
    var btn = dd.querySelector(".dropdown-toggle");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".has-dropdown.is-open").forEach(function (dd) {
      if (!dd.contains(e.target)) {
        dd.classList.remove("is-open");
        var b = dd.querySelector(".dropdown-toggle");
        if (b) b.setAttribute("aria-expanded", "false");
      }
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".has-dropdown.is-open").forEach(function (dd) {
      dd.classList.remove("is-open");
      var b = dd.querySelector(".dropdown-toggle");
      if (b) { b.setAttribute("aria-expanded", "false"); b.focus(); }
    });
  });

  /* Mobile nav */
  var toggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");
  toggle.addEventListener("click", function () {
    var open = mobileNav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  mobileNav.addEventListener("click", function (e) {
    if (e.target.closest("a")) {
      mobileNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  /* Scroll-spy for nav */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav a"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealer.observe(el); });
  }

  /* Contact form validation (front-end demo; wire to your backend/form service) */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var valid = true;
    form.querySelectorAll("[required]").forEach(function (field) {
      var ok = field.checkValidity() && field.value.trim() !== "";
      field.classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      status.textContent = "Please fill in the highlighted fields (valid email required).";
      status.className = "form-status err";
      return;
    }
    status.textContent = "Thanks — your message is ready to send. Connect this form to your email service to go live.";
    status.className = "form-status ok";
    form.reset();
  });
  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("is-invalid") && e.target.checkValidity()) {
      e.target.classList.remove("is-invalid");
    }
  });
})();
