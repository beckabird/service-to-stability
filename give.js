// Wires every [data-give] button to its Stripe Payment Link from donate-config.js.
// A button without a valid link becomes "Pledge this gift" and opens the pledge form with the gift pre-filled.
// [data-show="live"] shows only when every gift on the page has a link; [data-show="pledge"] when any is missing.
(function () {
  var cfg = window.STS_GIVE || {};
  var buttons = document.querySelectorAll('[data-give]');
  if (!buttons.length) return;
  var missing = false;
  buttons.forEach(function (a) {
    var key = a.getAttribute('data-give');
    var url = cfg[key];
    if (url && /^https:\/\/(buy|donate)\.stripe\.com\//.test(url)) {
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
    } else {
      missing = true;
      var to = (a.getAttribute('data-pledge') || '/get-involved#join-form').split('#');
      a.href = to[0] + '?gift=' + encodeURIComponent(key) + (to[1] ? '#' + to[1] : '');
      a.textContent = 'Pledge this gift';
    }
  });
  document.querySelectorAll('[data-show]').forEach(function (el) {
    el.hidden = el.getAttribute('data-show') === 'live' ? missing : !missing;
  });
})();
