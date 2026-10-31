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
