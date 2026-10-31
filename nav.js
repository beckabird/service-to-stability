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
