// Staff inbox: magic-link sign-in, submissions triage, gift records and settings.
// Access is enforced by the database (row level security + staff list); this page only reflects it.
(function () {
  var cfg = window.STS_FORMS || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
  var usd = function (c) { return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }); };
  var when = function (iso) { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  var GIFTS = { week: 'Sponsor a week ($350)', month: 'Sponsor a month ($1,400)', weekly: 'Standing sponsor ($350 a week)', custom: 'Their choice of amount' };
  var FORMS = { 'founding-list': 'Founding list', 'rally-point': 'Rally Point' };
  var STATUS = { new: 'New', contacted: 'Contacted', closed: 'Closed' };

  if (!window.supabase || !cfg.supabaseUrl) {
    show('signin');
    alertMsg($('[data-signin-alert]'), 'The inbox couldn’t load its sign-in service. Check your connection and refresh the page.');
    $('[data-signin] button').disabled = true;
    return;
  }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });

  var state = { email: '', status: 'new', form: 'all', q: '', rows: [], selected: null, gifts: [], editing: null };

  // ---------- views ----------
  function show(view) {
    $$('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
    $('[data-who]').hidden = !(view === 'app' || view === 'denied');
  }
  function alertMsg(el, html) { el.innerHTML = html; el.hidden = !html; }
  var toastTimer;
  function toast(msg) {
    var t = $('[data-toast]'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function busy(btn, on, label) {
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }
  function friendly(err) {
    var m = (err && (err.message || err.error_description)) || '';
    if (/fetch|network|Failed/i.test(m)) return 'We couldn’t reach the server. Check your connection and try again.';
    if (/JWT|expired|session/i.test(m)) return 'Your sign-in expired. Sign in again to continue.';
    if (/rate|too many|security purposes/i.test(m)) return 'Too many tries in a short time. Wait a minute, then try again.';
    return 'That didn\u2019t save. Try again, and if it keeps happening, sign out and back in. (' + esc(m || 'no details') + ')';
  }

  // ---------- auth ----------
  function linkErrorFromUrl() {
    var h = new URLSearchParams((location.hash || '').slice(1));
    var q = new URLSearchParams(location.search);
    var d = h.get('error_description') || q.get('error_description');
    if (d) history.replaceState(null, '', location.pathname);
    return d ? d.replace(/\+/g, ' ') : '';
  }

  async function route(session) {
    if (!session) { show('signin'); return; }
    state.email = session.user.email;
    $$('[data-who-email]').forEach(function (e) { e.textContent = state.email; });
    var r = await sb.rpc('am_i_staff');
    if (r.error) { show('signin'); alertMsg($('[data-signin-alert]'), friendly(r.error)); return; }
    if (!r.data) { $('[data-denied-email]').textContent = state.email; show('denied'); return; }
    show('app');
    loadInbox(); loadGifts(); loadSettings();
  }

  $('[data-signin]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var input = $('#s-email'), btn = e.currentTarget.querySelector('button[type=submit]');
    alertMsg($('[data-signin-alert]'), '');
    var email = input.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      input.setAttribute('aria-invalid', 'true');
      alertMsg($('[data-signin-alert]'), 'Enter an email address like name@example.org.');
      input.focus(); return;
    }
    input.removeAttribute('aria-invalid');
    busy(btn, true, 'Sending…');
    var r = await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + '/staff' } });
    busy(btn, false);
    if (r.error) { alertMsg($('[data-signin-alert]'), friendly(r.error)); return; }
    state.pending = email;
    $('[data-sent-email]').textContent = email;
    $('[data-resend-status]').textContent = '';
    show('sent'); $('[data-sent-panel]').focus();
  });

  $('[data-resend]').addEventListener('click', async function (e) {
    var btn = e.currentTarget; busy(btn, true, 'Sending…');
    var r = await sb.auth.signInWithOtp({ email: state.pending, options: { emailRedirectTo: location.origin + '/staff' } });
    $('[data-resend-status]').innerHTML = r.error ? friendly(r.error) : 'New link sent. Use the newest email; older links stop working.';
    setTimeout(function () { busy(btn, false); }, r.error ? 0 : 30000);
  });
  $('[data-change-email]').addEventListener('click', function () { show('signin'); $('#s-email').focus(); });
  $$('[data-signout]').forEach(function (b) {
    b.addEventListener('click', async function () { await sb.auth.signOut(); toast('Signed out.'); });
  });

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT') { state.rows = []; show('signin'); }
    if (event === 'SIGNED_IN' && $('[data-view="app"]').hidden) route(session);
  });

  // ---------- tabs ----------
  var tabs = $$('[data-tab]');
  function selectTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t.getAttribute('data-tab')); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-tab'), true); }
    });
  });

  // ---------- inbox ----------
  async function loadInbox() {
    $('[data-inbox-loading]').hidden = false; alertMsg($('[data-inbox-error]'), '');
    var r = await sb.from('submissions').select('*').order('created_at', { ascending: false }).limit(500);
    $('[data-inbox-loading]').hidden = true;
    if (r.error) { alertMsg($('[data-inbox-error]'), friendly(r.error) + ' <button type="button" class="link-btn" data-retry-inbox>Try again</button>'); $('[data-retry-inbox]').onclick = loadInbox; return; }
    state.rows = r.data; renderInbox();
  }
  function filtered() {
    var q = state.q.toLowerCase();
    return state.rows.filter(function (s) {
      if (state.status !== 'all' && s.status !== state.status) return false;
      if (state.form !== 'all' && s.form !== state.form) return false;
      if (q && [s.name, s.email, s.phone, s.org, s.note, s.staff_note, s.role].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function renderInbox() {
    var counts = { new: 0, contacted: 0, closed: 0 };
    state.rows.forEach(function (s) { counts[s.status]++; });
    var pill = $('[data-new-count]'); pill.textContent = counts.new; pill.hidden = !counts.new;
    $$('[data-status]').forEach(function (c) {
      var k = c.getAttribute('data-status');
      c.textContent = (k === 'all' ? 'All' : STATUS[k]) + ' ' + (k === 'all' ? state.rows.length : counts[k]);
      c.setAttribute('aria-pressed', k === state.status ? 'true' : 'false');
    });
    var list = filtered(), ul = $('[data-inbox-list]'), empty = $('[data-inbox-empty]');
    if (!list.length) {
      ul.innerHTML = '';
      empty.innerHTML = !state.rows.length
        ? '<h3>Nothing here yet.</h3><p>When someone joins the founding list or the Rally Point opening list, it shows up here.</p>'
        : state.q || state.form !== 'all'
          ? '<h3>No matches.</h3><p>Try a different search or show both forms.</p>'
          : state.status === 'new' ? '<h3>You’re caught up.</h3><p>No new messages right now.</p>' : '<h3>No messages here.</h3>';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      ul.innerHTML = list.map(function (s) {
        return '<li><button type="button" class="msg' + (state.selected === s.id ? ' is-on' : '') + '" data-id="' + s.id + '" aria-current="' + (state.selected === s.id) + '">' +
          '<span class="msg-top"><b>' + esc(s.name) + '</b><span class="tag tag-' + s.status + '">' + STATUS[s.status] + '</span></span>' +
          '<span class="msg-meta">' + FORMS[s.form] + (s.role ? ' · ' + esc(s.role) : '') + '</span>' +
          '<span class="msg-meta">' + when(s.created_at) + (s.gift ? ' · ' + GIFTS[s.gift] : '') + '</span></button></li>';
      }).join('');
    }
    if (state.selected && !state.rows.some(function (s) { return s.id === state.selected; })) closeDetail();
  }
  $('[data-inbox-list]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (b) openDetail(b.getAttribute('data-id'));
  });
  $$('[data-status]').forEach(function (c) { c.addEventListener('click', function () { state.status = c.getAttribute('data-status'); renderInbox(); }); });
  $('[data-form-filter]').addEventListener('change', function (e) { state.form = e.target.value; renderInbox(); });
  $('[data-search]').addEventListener('input', function (e) { state.q = e.target.value.trim(); renderInbox(); });

  function closeDetail() { state.selected = null; $('[data-detail]').hidden = true; renderInbox(); }
  function openDetail(id) {
    var s = state.rows.filter(function (r) { return r.id === id; })[0]; if (!s) return;
    state.selected = id; renderInbox();
    var d = $('[data-detail]');
    var row = function (k, v, html) { return v ? '<div><dt>' + k + '</dt><dd>' + (html || esc(v)) + '</dd></div>' : ''; };
    d.innerHTML = '<div class="card detail">' +
      '<div class="detail-head"><h2>' + esc(s.name) + '</h2><button type="button" class="link-btn" data-close>Close</button></div>' +
      '<dl class="detail-dl">' +
        row('Form', FORMS[s.form]) + row('Wants to', s.role) + row('Pledge', s.gift && GIFTS[s.gift]) +
        row('Email', s.email, s.email && '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>') +
        row('Phone', s.phone, s.phone && '<a href="tel:' + esc(s.phone.replace(/[^\d+]/g, '')) + '">' + esc(s.phone) + '</a>') +
        row('Organization', s.org) + row('County', s.county) + row('Timing', s.timing) + row('Received', when(s.created_at)) +
        row('Their note', s.note, s.note && '<span class="pre">' + esc(s.note) + '</span>') +
      '</dl>' +
      '<div class="field"><span class="field-label" id="st-label">Status</span><div class="seg" role="group" aria-labelledby="st-label">' +
        ['new', 'contacted', 'closed'].map(function (k) { return '<button type="button" class="seg-btn" aria-pressed="' + (s.status === k) + '" data-set-status="' + k + '">' + STATUS[k] + '</button>'; }).join('') +
      '</div></div>' +
      '<form data-note-form novalidate><div class="field"><label for="d-note">Staff note <span class="opt">(only staff see this)</span></label><textarea id="d-note" maxlength="2000">' + esc(s.staff_note || '') + '</textarea></div>' +
      '<div class="form-actions"><button class="btn btn-outline" type="submit">Save note</button>' +
      (s.gift || s.role && /pledge|sponsor/i.test(s.role) ? '<button type="button" class="btn btn-sand" data-gift-from>Record a gift</button>' : '') + '</div></form>' +
      '<div class="form-alert" role="alert" data-detail-alert hidden></div>' +
      '<div class="danger-zone"><button type="button" class="link-btn danger" data-delete>Delete this message</button><span data-confirm hidden> Delete for good? <button type="button" class="link-btn danger" data-delete-yes>Yes, delete</button> <button type="button" class="link-btn" data-delete-no>Keep it</button></span></div>' +
    '</div>';
    d.hidden = false;
    $('h2', d).setAttribute('tabindex', '-1'); $('h2', d).focus();
    if (window.innerWidth < 860) d.scrollIntoView({ block: 'start' });

    $('[data-close]', d).onclick = closeDetail;
    $$('[data-set-status]', d).forEach(function (b) {
      b.onclick = async function () {
        var k = b.getAttribute('data-set-status'); if (k === s.status) return;
        $$('[data-set-status]', d).forEach(function (x) { x.disabled = true; });
        var r = await sb.from('submissions').update({ status: k }).eq('id', s.id).select().single();
        $$('[data-set-status]', d).forEach(function (x) { x.disabled = false; });
        if (r.error) { alertMsg($('[data-detail-alert]', d), friendly(r.error)); return; }
        Object.assign(s, r.data); renderInbox(); openDetail(s.id); toast('Marked ' + STATUS[k].toLowerCase() + '.');
      };
    });
    $('[data-note-form]', d).addEventListener('submit', async function (e) {
      e.preventDefault(); var btn = e.currentTarget.querySelector('button[type=submit]'); busy(btn, true, 'Saving…');
      var r = await sb.from('submissions').update({ staff_note: $('#d-note').value.trim() || null }).eq('id', s.id).select().single();
      busy(btn, false);
      if (r.error) { alertMsg($('[data-detail-alert]', d), friendly(r.error)); return; }
      Object.assign(s, r.data); alertMsg($('[data-detail-alert]', d), ''); toast('Note saved.');
    });
    var gf = $('[data-gift-from]', d);
    if (gf) gf.onclick = function () { selectTab('gifts'); openGiftForm(null, s); };
    $('[data-delete]', d).onclick = function () { $('[data-confirm]', d).hidden = false; $('[data-delete-no]', d).focus(); };
    $('[data-delete-no]', d).onclick = function () { $('[data-confirm]', d).hidden = true; $('[data-delete]', d).focus(); };
    $('[data-delete-yes]', d).onclick = async function () {
      var r = await sb.from('submissions').delete().eq('id', s.id);
      if (r.error) { alertMsg($('[data-detail-alert]', d), friendly(r.error)); return; }
      state.rows = state.rows.filter(function (x) { return x.id !== s.id; }); closeDetail(); toast('Message deleted.');
    };
  }

  // ---------- gifts ----------
  async function loadGifts() {
    $('[data-gifts-loading]').hidden = false; alertMsg($('[data-gifts-error]'), '');
    var r = await Promise.all([
      sb.from('gifts').select('*').order('created_at', { ascending: false }),
      sb.from('settings').select('*').eq('key', 'goal_cents').maybeSingle()
    ]);
    $('[data-gifts-loading]').hidden = true;
    if (r[0].error || r[1].error) { alertMsg($('[data-gifts-error]'), friendly(r[0].error || r[1].error) + ' <button type="button" class="link-btn" data-retry-gifts>Try again</button>'); $('[data-retry-gifts]').onclick = loadGifts; return; }
    state.gifts = r[0].data; state.goal = r[1].data ? r[1].data.value : 0;
    renderGifts();
  }
  function renderGifts() {
    var pledged = 0, received = 0, beds = 0;
    state.gifts.forEach(function (g) { if (g.amount_cents) { pledged += g.amount_cents; if (g.status === 'received') received += g.amount_cents; } if (g.bed) beds++; });
    $('[data-gift-summary]').innerHTML =
      '<div><span class="n">' + usd(pledged) + '</span><span>pledged of ' + usd(state.goal || 0) + '</span></div>' +
      '<div><span class="n">' + usd(received) + '</span><span>received</span></div>' +
      '<div><span class="n">' + beds + ' of 8</span><span>beds sponsored</span></div>';
    var ul = $('[data-gifts-list]');
    $('[data-gifts-empty]').hidden = !!state.gifts.length;
    ul.innerHTML = state.gifts.map(function (g) {
      return '<li><button type="button" class="msg" data-gift="' + g.id + '">' +
        '<span class="msg-top"><b>' + esc(g.donor_name) + '</b><span class="tag tag-' + (g.status === 'received' ? 'closed' : 'new') + '">' + (g.status === 'received' ? 'Received' : 'Pledged') + '</span></span>' +
        '<span class="msg-meta">' + (g.amount_cents ? usd(g.amount_cents) : 'Amount not recorded') + (g.bed ? ' · Bed ' + g.bed : '') + (g.public_name ? ' · Shown as ' + esc(g.public_name) : ' · Private') + '</span></button></li>';
    }).join('');
  }
  $('[data-gifts-list]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-gift]'); if (!b) return;
    openGiftForm(state.gifts.filter(function (g) { return g.id === b.getAttribute('data-gift'); })[0]);
  });
  $('[data-new-gift]').addEventListener('click', function () { openGiftForm(null); });
  $('[data-cancel-gift]').addEventListener('click', function () { $('[data-gift-form-wrap]').hidden = true; $('[data-new-gift]').focus(); });

  function openGiftForm(g, fromSubmission) {
    state.editing = g ? g.id : null; state.fromSubmission = fromSubmission ? fromSubmission.id : null;
    var f = $('[data-gift-form]'); f.reset(); alertMsg($('[data-gift-alert]'), '');
    $$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    $('[data-gift-form-title]').textContent = g ? 'Edit gift' : 'Record a gift';
    var taken = {}; state.gifts.forEach(function (x) { if (x.bed && (!g || x.id !== g.id)) taken[x.bed] = x.public_name || x.donor_name; });
    var bedSel = $('#g-bed'); bedSel.innerHTML = '<option value="">No bed</option>';
    for (var i = 1; i <= 8; i++) bedSel.insertAdjacentHTML('beforeend', '<option value="' + i + '"' + (taken[i] ? ' disabled' : '') + '>Bed ' + i + (taken[i] ? ' (taken by ' + esc(taken[i]) + ')' : '') + '</option>');
    var amountFor = { week: '350', month: '1400', weekly: '350' };
    if (g) {
      $('#g-donor').value = g.donor_name; $('#g-public').value = g.public_name || '';
      $('#g-amount').value = g.amount_cents ? String(g.amount_cents / 100) : ''; $('#g-status').value = g.status;
      bedSel.value = g.bed ? String(g.bed) : ''; $('#g-note').value = g.note || '';
    } else if (fromSubmission) {
      $('#g-donor').value = fromSubmission.org || fromSubmission.name;
      $('#g-amount').value = amountFor[fromSubmission.gift] || '';
      $('#g-note').value = 'From ' + FORMS[fromSubmission.form] + ' submission by ' + fromSubmission.name + '.';
    }
    var del = $('[data-delete-gift]', f); if (del) del.remove();
    if (g) $('.form-actions', f).insertAdjacentHTML('beforeend', '<button type="button" class="link-btn danger" data-delete-gift>Delete gift</button>');
    $('[data-gift-form-wrap]').hidden = false; $('#g-donor').focus();
    if (window.innerWidth < 860) $('[data-gift-form-wrap]').scrollIntoView({ block: 'start' });
    var dg = $('[data-delete-gift]', f);
    if (dg) dg.onclick = async function () {
      if (dg.dataset.armed !== '1') { dg.dataset.armed = '1'; dg.textContent = 'Yes, delete this gift'; return; }
      var r = await sb.from('gifts').delete().eq('id', g.id);
      if (r.error) { alertMsg($('[data-gift-alert]'), friendly(r.error)); return; }
      $('[data-gift-form-wrap]').hidden = true; toast('Gift deleted.'); loadGifts();
    };
  }

  $('[data-gift-form]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = e.currentTarget, btn = f.querySelector('button[type=submit]'), alertEl = $('[data-gift-alert]');
    var donor = $('#g-donor').value.trim(), amt = $('#g-amount').value.trim().replace(/[$,\s]/g, '');
    $$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var bad = [];
    if (!donor) { $('#g-donor').setAttribute('aria-invalid', 'true'); bad.push('Add the donor’s name.'); }
    if (amt && !/^\d+(\.\d{1,2})?$/.test(amt) || amt && Number(amt) <= 0) { $('#g-amount').setAttribute('aria-invalid', 'true'); bad.push('Enter the amount as a number, like 350 or 1400.'); }
    if (bad.length) { alertMsg(alertEl, bad.join(' ')); f.querySelector('[aria-invalid]').focus(); return; }
    var row = { donor_name: donor, public_name: $('#g-public').value.trim() || null, amount_cents: amt ? Math.round(Number(amt) * 100) : null,
      status: $('#g-status').value, bed: $('#g-bed').value ? Number($('#g-bed').value) : null, note: $('#g-note').value.trim() || null };
    if (!state.editing && state.fromSubmission) row.submission_id = state.fromSubmission;
    busy(btn, true, 'Saving…');
    var r = state.editing ? await sb.from('gifts').update(row).eq('id', state.editing) : await sb.from('gifts').insert(row);
    busy(btn, false);
    if (r.error) {
      alertMsg(alertEl, /gifts_one_sponsor_per_bed|duplicate/.test(r.error.message) ? 'That bed already has a sponsor. Pick another bed or edit the existing gift.' : friendly(r.error));
      return;
    }
    $('[data-gift-form-wrap]').hidden = true; toast(state.editing ? 'Gift updated. The Sponsor page meter now shows it.' : 'Gift recorded. The Sponsor page meter now shows it.');
    loadGifts();
  });

  // ---------- settings ----------
  async function loadSettings() {
    var goal = await sb.from('settings').select('value').eq('key', 'goal_cents').maybeSingle();
    if (!goal.error && goal.data) $('#st-goal').value = String(goal.data.value / 100);
    loadStaff();
  }
  async function loadStaff() {
    $('[data-staff-loading]').hidden = false;
    var r = await sb.from('staff').select('email, added_at').order('added_at');
    $('[data-staff-loading]').hidden = true;
    if (r.error) { alertMsg($('[data-staff-alert]'), friendly(r.error)); return; }
    $('[data-staff-list]').innerHTML = r.data.map(function (s) {
      var me = s.email === (state.email || '').toLowerCase();
      return '<li><span>' + esc(s.email) + (me ? ' <span class="opt">(you)</span>' : '') + '</span>' +
        (me ? '' : '<button type="button" class="link-btn danger" data-remove-staff="' + esc(s.email) + '">Remove</button>') + '</li>';
    }).join('');
  }
  $('[data-staff-list]').addEventListener('click', async function (e) {
    var b = e.target.closest('[data-remove-staff]'); if (!b) return;
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Yes, remove'; return; }
    var r = await sb.from('staff').delete().eq('email', b.getAttribute('data-remove-staff'));
    if (r.error) { alertMsg($('[data-staff-alert]'), friendly(r.error)); return; }
    toast('Removed from the staff list.'); loadStaff();
  });
  $('[data-staff-form]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var input = $('#st-new'), email = input.value.trim().toLowerCase(), btn = e.currentTarget.querySelector('button');
    alertMsg($('[data-staff-alert]'), '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { input.setAttribute('aria-invalid', 'true'); alertMsg($('[data-staff-alert]'), 'Enter an email address like name@example.org.'); input.focus(); return; }
    input.removeAttribute('aria-invalid'); busy(btn, true, 'Adding…');
    var r = await sb.from('staff').insert({ email: email });
    busy(btn, false);
    if (r.error) { alertMsg($('[data-staff-alert]'), /duplicate/.test(r.error.message) ? 'That email is already on the staff list.' : friendly(r.error)); return; }
    input.value = ''; toast(email + ' can now sign in.'); loadStaff();
  });
  $('[data-goal-form]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var input = $('#st-goal'), v = input.value.trim().replace(/[$,\s]/g, ''), btn = e.currentTarget.querySelector('button');
    alertMsg($('[data-goal-alert]'), '');
    if (!/^\d+$/.test(v) || Number(v) < 1) { input.setAttribute('aria-invalid', 'true'); alertMsg($('[data-goal-alert]'), 'Enter the goal in whole dollars, like 94000.'); input.focus(); return; }
    input.removeAttribute('aria-invalid'); busy(btn, true, 'Saving…');
    var r = await sb.from('settings').upsert({ key: 'goal_cents', value: Number(v) * 100 });
    busy(btn, false);
    if (r.error) { alertMsg($('[data-goal-alert]'), friendly(r.error)); return; }
    toast('Goal saved. The Sponsor page now shows $' + Number(v).toLocaleString('en-US') + '.'); loadGifts();
  });

  // ---------- boot ----------
  var linkErr = linkErrorFromUrl();
  sb.auth.getSession().then(function (res) {
    if (linkErr && !res.data.session) {
      show('signin');
      alertMsg($('[data-signin-alert]'), /expired|invalid/i.test(linkErr) ? 'That sign-in link has expired or was already used. Enter your email for a new one.' : esc(linkErr));
      return;
    }
    route(res.data.session);
  }, function (err) { show('signin'); alertMsg($('[data-signin-alert]'), friendly(err)); });
})();
