// Live fundraising meter and bed board on /sponsor, from the public totals function in Supabase.
// The page ships with the last known state, so it reads correctly before (or without) this script.
(function () {
  var cfg = window.STS_FORMS || {};
  var meter = document.getElementById('meter');
  if (!meter || !cfg.supabaseUrl || !cfg.supabaseKey) return;
  var $ = function (sel) { return meter.querySelector(sel); };
  var usd = function (cents) { return '$' + Math.round(cents / 100).toLocaleString('en-US'); };
  var status = $('[data-meter-status]'), note = $('[data-meter-note]'), bar = $('[data-meter-bar]');

  function setState(state, msg) { meter.setAttribute('data-state', state); status.textContent = msg; }

  function renderBeds(beds) {
    var grid = document.querySelector('[data-beds]'), count = document.querySelector('[data-bed-count]');
    if (!grid) return;
    var byBed = {}; beds.forEach(function (b) { byBed[b.bed] = b.name || 'Sponsored'; });
    var html = '', taken = 0, labels = [];
    for (var i = 1; i <= 8; i++) {
      var name = byBed[i]; if (name) taken++;
      labels.push('bed ' + i + (name ? ' sponsored by ' + name : ' open'));
      var safe = document.createElement('span'); safe.textContent = name || 'Open';
      html += '<div class="bed' + (name ? ' taken' : '') + '" role="listitem"><svg viewBox="0 0 44 28" aria-hidden="true"><use href="#bed"/></svg><b>Bed ' + i + '</b><span>' + safe.innerHTML + '</span></div>';
    }
    grid.innerHTML = html;
    grid.setAttribute('aria-label', 'Eight beds: ' + labels.join(', '));
    if (count) count.textContent = taken + ' of 8 sponsored';
  }

  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
  fetch(cfg.supabaseUrl + '/rest/v1/rpc/fundraising_progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': cfg.supabaseKey },
    body: '{}', signal: ctrl ? ctrl.signal : undefined
  }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    clearTimeout(timer);
    var goal = d.goal_cents || 0, pledged = d.pledged_cents || 0, received = d.received_cents || 0;
    var pct = goal ? Math.min(100, Math.round(pledged / goal * 1000) / 10) : 0;
    $('[data-meter-pledged]').textContent = usd(pledged);
    $('[data-meter-goal]').textContent = usd(goal);
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-valuetext', usd(pledged) + ' of ' + usd(goal));
    bar.firstElementChild.style.width = pct + '%';
    renderBeds(d.beds || []);
    if (!pledged) {
      note.innerHTML = 'No gifts recorded yet. <a class="link" href="/donate">Yours could be the first.</a>';
    } else {
      note.textContent = usd(received) + ' received so far. Pledges count once they’re confirmed by our team.';
    }
    note.hidden = false;
    var when = d.updated_at ? new Date(d.updated_at) : null;
    setState(pledged ? 'ready' : 'empty', when ? 'Updated ' + when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Up to date');
  }).catch(function () {
    clearTimeout(timer);
    setState('error', 'Totals unavailable');
    note.textContent = 'We couldn’t load the latest totals just now. The budget below is current; refresh the page to try again.';
    note.hidden = false;
  });
})();
