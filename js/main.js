/* GET OUT THERE — v2 interactions (vanilla, no deps) */
(function () {
  'use strict';

  /* nav */
  var nav = document.querySelector('.nav');
  var onScrollNav = function () {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  var burger = document.querySelector('.nav__burger');
  if (burger) {
    burger.addEventListener('click', function () {
      document.body.classList.toggle('menu-open');
    });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
    });
  }

  /* reveal on scroll */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* count-up stats */
  var animateCount = function (el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var decimals = (el.dataset.count.indexOf('.') > -1) ? 1 : 0;
    var dur = 1400, start = null;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  var ioCount = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { animateCount(e.target); ioCount.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { ioCount.observe(el); });

  /* hero + banner parallax */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', function () {
      parallaxEls.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        el.style.transform = 'translateY(' + (r.top * -0.18) + 'px) scale(1.12)';
      });
    }, { passive: true });
  }

  /* photo band — drag / auto-drift horizontal strip */
  document.querySelectorAll('.photo-band').forEach(function (band) {
    var track = band.querySelector('.photo-band__track');
    if (!track) return;
    /* duplicate content for seamless loop */
    track.innerHTML += track.innerHTML;
    var x = 0, half = 0, dragging = false, startX = 0, lastX = 0, vel = 0;
    var measure = function () { half = track.scrollWidth / 2; };
    window.addEventListener('load', measure); measure();
    var tick = function () {
      if (!dragging) { x -= 0.5 + vel; vel *= 0.94; }
      if (half > 0) { if (x <= -half) x += half; if (x > 0) x -= half; }
      track.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    band.addEventListener('pointerdown', function (e) {
      dragging = true; startX = e.clientX; lastX = x; band.setPointerCapture(e.pointerId);
    });
    band.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var nx = lastX + (e.clientX - startX);
      vel = (x - nx) * 0.08; x = nx;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      band.addEventListener(ev, function () { dragging = false; });
    });
  });

  /* itinerary accordions */
  document.querySelectorAll('.itin__head').forEach(function (head) {
    head.addEventListener('click', function () {
      var item = head.parentElement;
      var body = item.querySelector('.itin__body');
      var open = item.classList.toggle('open');
      body.style.maxHeight = open ? body.scrollHeight + 'px' : 0;
    });
  });

  /* current year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
