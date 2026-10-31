// Site-wide behavior, one file: start each page at the top, the mobile menu, and scroll reveal.

// Start at the top on every page view, unless the URL points at a section.
(function () {
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  function toTop() {
    var id = (location.hash || '').slice(1);
    if (id && document.getElementById(id)) return;
    window.scrollTo(0, 0);
  }
  toTop();
  window.addEventListener('pageshow', toTop);
  window.addEventListener('load', toTop);
})();

// Mobile menu: close with Escape (focus returns to the button), on an outside tap, or after choosing a link.
(function () {
  var menu = document.querySelector('details.menu');
  if (!menu) return;
  var summary = menu.querySelector('summary');
  summary.setAttribute('aria-label', 'Menu');
  function sync() { summary.setAttribute('aria-expanded', menu.open ? 'true' : 'false'); }
  menu.addEventListener('toggle', sync); sync();
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  menu.querySelectorAll('.menu-panel a').forEach(function (a) {
    a.addEventListener('click', function () { menu.open = false; });
  });
})();

// Scroll reveal. Only elements that start below the fold are hidden, so the first frame is always complete,
// and nothing inside a form, its success panel or a hero ever waits on motion.
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sel = '.section-head, .stats, .doors > *, .gives > *, .included, .steps, .road > li, .partners > *, .house > *, .goal > *, ' +
            '.beds-wrap, .amounts, .faq, .help-card, .rp-split > *, .chapters, .link-grid > *, .gap > *, .join .intro, .next .wrap, .band .head, .checks';
  var fold = window.innerHeight * 0.9;
  var els = Array.prototype.filter.call(document.querySelectorAll(sel), function (el) {
    return !el.closest('.hero, .page-hero, form, .done, .rv') && el.getBoundingClientRect().top > fold;
  });
  if (!els.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('rv-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) {
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty('--rv-delay', Math.min(i, 2) * 30 + 'ms');
    el.classList.add('rv');
    io.observe(el);
  });
  // Never leave content hidden: reveal everything if the page is printed or the observer stalls.
  window.addEventListener('beforeprint', function () { els.forEach(function (el) { el.classList.add('rv-in'); }); });
})();
