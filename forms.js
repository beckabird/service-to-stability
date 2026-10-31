// Validation and submission for every form marked data-form="<name>".
// Fields: data-label names a field in the message; required inputs carry `required`;
// data-check="email" or "phone" adds format checks. A hidden input named company_website is a bot trap.
(function () {
  var cfg = window.STS_FORMS || {};
  var GIFTS = {
    week: 'Sponsor a week ($350, one time)',
    month: 'Sponsor a month ($1,400, one time)',
    weekly: 'Standing sponsor ($350 a week, recurring)',
    custom: 'A gift of my choosing'
  };

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function setError(field, msg) {
    var wrap = field.closest('.field');
    var id = field.id + '-err';
    var el = document.getElementById(id);
    if (!msg) {
      field.removeAttribute('aria-invalid');
      if (el) el.remove();
      field.removeAttribute('aria-describedby');
      return;
    }
    field.setAttribute('aria-invalid', 'true');
    if (!el) {
      el = document.createElement('span');
      el.className = 'field-error'; el.id = id;
      wrap.appendChild(el);
    }
    el.textContent = msg;
    field.setAttribute('aria-describedby', id);
  }

  function check(field) {
    var v = field.value.trim();
    var label = field.getAttribute('data-label') || 'This field';
    if (field.required && !v) return label + ' is required.';
    if (v && field.getAttribute('data-check') === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter an email address like name@example.org.';
    if (v && field.getAttribute('data-check') === 'phone' && v.replace(/\D/g, '').length < 10) return 'Enter a 10-digit phone number, including area code.';
    return '';
  }

  function prefillGift(form) {
    var m = /[?&]gift=([a-z]+)/.exec(location.search);
    var gift = m && GIFTS[m[1]];
    if (!gift) return;
    var role = form.querySelector('[data-gift-role]');
    if (role) role.value = role.getAttribute('data-gift-role');
    role && role.dispatchEvent(new Event('change'));
    var note = form.querySelector('textarea');
    if (note && !note.value) note.value = 'I\'d like to pledge: ' + gift + '.';
  }

  function presetFromHash(form) {
    var h = (location.hash || '').slice(1);
    var sel = form.querySelector('select[data-hash-select]');
    if (h && sel && sel.querySelector('option[value="' + h + '"]')) { sel.value = h; sel.dispatchEvent(new Event('change')); }
  }

  function collect(form) {
    var rows = [], data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'company_website' || el.type === 'submit' || el.closest('[hidden]')) return;
      var v = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value.trim();
      data[el.name] = v;
      if (v) rows.push((el.getAttribute('data-label') || el.name) + ': ' + v);
    });
    return { rows: rows, data: data };
  }

  function showDone(form, html) {
    var done = document.getElementById(form.getAttribute('data-done'));
    done.innerHTML = html;
    form.hidden = true;
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
    done.focus();
    done.scrollIntoView({ block: 'start' });
  }

  function init(form) {
    var name = form.getAttribute('data-form');
    var subject = form.getAttribute('data-subject') || 'Website form';
    var btn = form.querySelector('button[type="submit"]');
    var btnText = btn.textContent;
    var summary = document.createElement('div');
    summary.className = 'form-alert'; summary.setAttribute('role', 'alert'); summary.hidden = true;
    form.insertBefore(summary, btn);

    presetFromHash(form);
    prefillGift(form);

    form.querySelectorAll('input, textarea').forEach(function (f) {
      f.addEventListener('blur', function () { if (f.getAttribute('aria-invalid')) setError(f, check(f)); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) setError(f, check(f)); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      summary.hidden = true;
      var trap = form.querySelector('[name="company_website"]');
      if (trap && trap.value) return;
      var bad = [];
      form.querySelectorAll('input:not([type=hidden]), textarea').forEach(function (f) {
        if (f.closest('[hidden]') || f.name === 'company_website') return;
        var msg = check(f); setError(f, msg); if (msg) bad.push(f);
      });
      if (bad.length) {
        summary.textContent = bad.length === 1 ? 'Fix the highlighted field to continue.' : 'Fix the ' + bad.length + ' highlighted fields to continue.';
        summary.hidden = false;
        bad[0].focus();
        return;
      }
      var c = collect(form);
      var body = c.rows.join('\n');
      var heading = form.getAttribute('data-done-title') || 'Thank you.';
      var after = form.getAttribute('data-done-text') || '';
      var crisis = '<p class="done-help">If you or a veteran you know needs help today, call 988 and press 1, or the VA homeless veteran line at 877-424-3838.</p>';

      if (cfg.endpoint) {
        btn.disabled = true; btn.textContent = 'Sending…'; form.setAttribute('aria-busy', 'true');
        fetch(cfg.endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ form: name, page: location.pathname, submitted_at: new Date().toISOString(), fields: c.data })
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          showDone(form, '<h3>' + esc(heading) + '</h3><p>' + esc(after) + '</p>' + crisis);
        }).catch(function () {
          btn.disabled = false; btn.textContent = btnText; form.removeAttribute('aria-busy');
          summary.innerHTML = 'We couldn\'t send that. Your answers are still here: try again, or email <a href="mailto:' + esc(cfg.inbox) + '">' + esc(cfg.inbox) + '</a> or call ' + esc(cfg.phone) + '.';
          summary.hidden = false; btn.focus();
        });
        return;
      }

      var href = 'mailto:' + cfg.inbox + '?subject=' + encodeURIComponent(subject + ': ' + (c.data.name || '')) + '&body=' + encodeURIComponent(body);
      showDone(form,
        '<h3>One last step: send the email.</h3>' +
        '<p>Your email app should have opened with your message ready to go. Press send and it reaches us at ' + esc(cfg.inbox) + '.</p>' +
        '<p class="done-actions"><a class="btn btn-sand" href="' + esc(href) + '">Open the email again</a> <button type="button" class="btn btn-outline" data-copy>Copy the message</button></p>' +
        '<p class="done-fallback">No email app? Copy the message and send it to ' + esc(cfg.inbox) + ', or call ' + esc(cfg.phone) + '.</p>' +
        '<pre class="done-message">' + esc('To: ' + cfg.inbox + '\nSubject: ' + subject + ': ' + (c.data.name || '') + '\n\n' + body) + '</pre>' +
        '<p><button type="button" class="link-btn" data-edit>Edit my answers</button></p>' + crisis);
      var done = document.getElementById(form.getAttribute('data-done'));
      done.querySelector('[data-copy]').addEventListener('click', function (ev) {
        var b = ev.currentTarget, text = done.querySelector('.done-message').textContent;
        function ok() { b.textContent = 'Copied'; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, select); else select();
        function select() { var r = document.createRange(); r.selectNodeContents(done.querySelector('.done-message')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected: press Ctrl+C or Cmd+C'; }
      });
      done.querySelector('[data-edit]').addEventListener('click', function () { done.hidden = true; form.hidden = false; form.querySelector('input, select, textarea').focus(); });
      window.location.href = href;
    });
  }

  document.querySelectorAll('form[data-form]').forEach(init);
})();
