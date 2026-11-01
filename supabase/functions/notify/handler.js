// Sends email through Resend when a form submission or a Stripe gift lands in the database.
// A database trigger posts { table, id }. This function re-reads the row with the service key,
// so the request carries no data and needs no secret: a caller can only cause the normal
// emails for a real row, once, because the row is claimed (notified_at set) before sending.
// Privacy: staff alerts carry a name, the reason and a link to /staff. Never phone, notes or county.

const SITE = 'https://www.project-pledge.com';

const ROLES = {
  sponsor: 'Sponsor or pledge a gift',
  property: 'Offer a property',
  partner: 'Referral partner',
  volunteer: 'Volunteer or offer a job',
  veteran: 'Veteran',
  family: 'Family member',
  referrer: 'Referring a veteran',
  manager: 'House Manager applicant',
  other: 'Something else',
};
const FORMS = { 'founding-list': 'Founding list', 'rally-point': 'Rally Point House' };

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function firstName(name) {
  const f = String(name || '').trim().split(/\s+/)[0];
  return f ? f.slice(0, 40) : 'there';
}

function dollars(cents) {
  const d = cents / 100;
  return '$' + d.toLocaleString('en-US', { minimumFractionDigits: d % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

function layout(body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1d2733">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px">
<tr><td style="background:#163A5F;color:#ffffff;padding:18px 24px;font-weight:bold;font-size:16px;border-radius:8px 8px 0 0">The Service to Stability Project</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.55">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t) => `<p style="margin:0 0 14px">${t}</p>`;
const button = (href, label) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#C9A86A;color:#1d2733;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px;display:inline-block">${esc(label)}</a></p>`;

// Returns the list of emails to send for one row. Pure, so it is easy to test.
export function buildEmails(table, row, cfg) {
  const out = [];
  if (table === 'submissions') {
    const form = FORMS[row.form] || 'Website form';
    const role = ROLES[row.role] || row.role || 'Not given';
    out.push({
      to: cfg.staffTo,
      reply_to: row.email || undefined,
      subject: `New ${form} request: ${row.name || 'no name'}`,
      html: layout(
        p(`<b>${esc(row.name || 'Someone')}</b> sent a ${esc(form)} request.`) +
        p(`Reason: ${esc(role)}${row.org ? `<br>Organization: ${esc(row.org)}` : ''}`) +
        p('Contact details and notes are in the staff inbox, not in this email.') +
        button(`${SITE}/staff`, 'Open the staff inbox')),
      text: `${row.name || 'Someone'} sent a ${form} request.\nReason: ${role}\nOpen the staff inbox: ${SITE}/staff`,
    });
    if (row.email) {
      const rally = row.form === 'rally-point';
      out.push({
        to: row.email,
        reply_to: cfg.replyTo,
        subject: rally ? "We got your Rally Point House request" : "You're on the founding list",
        html: layout(
          p(`Hi ${esc(firstName(row.name))},`) +
          p(rally
            ? "Thank you for reaching out. We have your request and we'll call you before The Rally Point House opens, in the order requests come in."
            : "Thank you for joining the founding list. We'll be in touch personally as the first house comes together.") +
          p(`If something changes or you have a question, reply to this email or call ${esc(cfg.phone)}.`) +
          p('If you or a veteran you know is in crisis, call or text 988 and press 1, any time.') +
          p('The Service to Stability Project')),
        text: `Hi ${firstName(row.name)},\n\n${rally
          ? "Thank you for reaching out. We have your request and we'll call you before The Rally Point House opens, in the order requests come in."
          : "Thank you for joining the founding list. We'll be in touch personally as the first house comes together."}\n\nQuestions? Reply to this email or call ${cfg.phone}.\nIn crisis? Call or text 988 and press 1.\n\nThe Service to Stability Project`,
      });
    }
    return out;
  }
  if (table === 'gifts') {
    if (row.source !== 'stripe' || !(row.amount_cents > 0)) return out;
    const amount = dollars(row.amount_cents);
    const what = String(row.note || '').replace(/^Stripe:\s*/, '').replace(/\.$/, '') || 'Online gift';
    out.push({
      to: cfg.staffTo,
      reply_to: row.donor_email || undefined,
      subject: `New gift: ${amount} from ${row.donor_name || 'an online donor'}`,
      html: layout(
        p(`<b>${esc(row.donor_name || 'An online donor')}</b> gave <b>${esc(amount)}</b> through Stripe.`) +
        p(`Gift: ${esc(what)}`) +
        p('It is already counted on the Sponsor page meter. Send a personal thank you when you can.') +
        button(`${SITE}/staff`, 'See it in Gifts')),
      text: `${row.donor_name || 'An online donor'} gave ${amount} through Stripe.\nGift: ${what}\n${SITE}/staff`,
    });
    if (row.donor_email) {
      out.push({
        to: row.donor_email,
        reply_to: cfg.replyTo,
        subject: `Thank you for your ${amount} gift`,
        html: layout(
          p(`Hi ${esc(firstName(row.donor_name))},`) +
          p(`Thank you for your gift of <b>${esc(amount)}</b> to The Service to Stability Project. It goes straight toward opening The Rally Point House, a sober home for veterans in Clarksville.`) +
          p('Stripe sent your payment receipt separately. Keep it for your records.') +
          p(`Want to see where things stand? The meter on our Sponsor page shows the founding goal in real time.`) +
          button(`${SITE}/sponsor`, 'See the founding goal') +
          p(`Questions about your gift? Reply to this email or call ${esc(cfg.phone)}.`) +
          p('With gratitude,<br>The Service to Stability Project')),
        text: `Hi ${firstName(row.donor_name)},\n\nThank you for your gift of ${amount} to The Service to Stability Project. It goes straight toward opening The Rally Point House, a sober home for veterans in Clarksville.\n\nStripe sent your payment receipt separately. Keep it for your records.\n\nSee the founding goal: ${SITE}/sponsor\nQuestions? Reply to this email or call ${cfg.phone}.\n\nWith gratitude,\nThe Service to Stability Project`,
      });
    }
  }
  return out;
}

const TABLES = { submissions: 'id,form,role,name,email,org,notified_at', gifts: 'id,donor_name,donor_email,amount_cents,source,note,notified_at' };

export async function notify({ table, id }, env, fetchImpl) {
  if (!TABLES[table]) return { status: 400, result: 'unknown table' };
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return { status: 400, result: 'bad id' };
  if (!env.RESEND_API_KEY) return { status: 200, result: 'skipped: RESEND_API_KEY not set' };
  const base = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
  const r = await fetchImpl(`${base}?select=${TABLES[table]}&id=eq.${id}`, { headers: h });
  if (!r.ok) throw new Error(`select failed ${r.status}`);
  const [row] = await r.json();
  if (!row) return { status: 404, result: 'no such row' };
  if (row.notified_at) return { status: 200, result: 'already sent' };

  // Claim the row first so two calls never double-send.
  const claim = await fetchImpl(`${base}?id=eq.${id}&notified_at=is.null`, {
    method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
  if (!claim.ok) throw new Error(`claim failed ${claim.status}`);
  if (!(await claim.json()).length) return { status: 200, result: 'already sent' };

  const cfg = { staffTo: env.NOTIFY_TO, replyTo: env.NOTIFY_REPLY_TO, phone: env.NOTIFY_PHONE };
  const emails = buildEmails(table, row, cfg);
  const sent = [];
  for (const e of emails) {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.NOTIFY_FROM, ...e }),
    });
    if (!res.ok) {
      // Release the claim so a retry can send again.
      await fetchImpl(`${base}?id=eq.${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ notified_at: null }) });
      throw new Error(`resend failed ${res.status} ${await res.text()}`);
    }
    sent.push(e.subject);
  }
  return { status: 200, result: `sent ${sent.length}` };
}
