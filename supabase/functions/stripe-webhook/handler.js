// Stripe webhook -> public.gifts. Verifies Stripe's signature, then records gifts and refunds.
// Works in Deno (Supabase Edge Functions) and Node 18+ (for tests): uses only fetch and Web Crypto.

const LABELS = { 22600: 'Sponsor a week', 90400: 'Sponsor a month' };
const TOLERANCE_SECONDS = 300;

function hex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyStripeSignature(rawBody, header, secret, nowSeconds) {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = (parts.find(([k]) => k === 't') || [])[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(nowSeconds - Number(t)) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`)));
  return sigs.some((s) => safeEqual(s, expected));
}

function db(env, fetchImpl) {
  const base = `${env.SUPABASE_URL}/rest/v1/gifts`;
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
  return {
    async find(query) {
      const r = await fetchImpl(`${base}?select=id,amount_cents&${query}`, { headers });
      if (!r.ok) throw new Error(`select failed ${r.status}`);
      return r.json();
    },
    async insert(row) {
      const r = await fetchImpl(base, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      if (r.status === 409) return 'duplicate';
      if (!r.ok) throw new Error(`insert failed ${r.status} ${await r.text()}`);
      return 'inserted';
    },
    async update(id, patch) {
      const r = await fetchImpl(`${base}?id=eq.${id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      if (!r.ok) throw new Error(`update failed ${r.status}`);
    },
    async remove(id) {
      const r = await fetchImpl(`${base}?id=eq.${id}`, { method: 'DELETE', headers });
      if (!r.ok) throw new Error(`delete failed ${r.status}`);
    },
  };
}

async function recordGift(store, { ref, paymentIntent, amount, name, email, label }) {
  if (!amount || amount <= 0) return 'skipped: no amount';
  const existing = await store.find(`stripe_ref=eq.${encodeURIComponent(ref)}`);
  if (existing.length) return 'duplicate';
  return store.insert({
    donor_name: (name || email || 'Online donor').slice(0, 160),
    donor_email: email ? email.slice(0, 200) : null,
    amount_cents: amount,
    status: 'received',
    source: 'stripe',
    stripe_ref: ref,
    stripe_payment_intent: paymentIntent || null,
    note: `Stripe: ${label}.`,
  });
}

export async function handleEvent(event, env, fetchImpl) {
  const store = db(env, fetchImpl);
  const o = event.data && event.data.object;
  switch (event.type) {
    // One-time gifts. Subscriptions are recorded from invoices so each week counts once.
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (o.mode !== 'payment' || o.payment_status !== 'paid') return 'skipped: not a paid one-time checkout';
      const cd = o.customer_details || {};
      return recordGift(store, { ref: o.id, paymentIntent: o.payment_intent, amount: o.amount_total, name: cd.name, email: cd.email,
        label: LABELS[o.amount_total] || 'Give any amount' });
    }
    // Recurring gifts: the first week and every renewal.
    case 'invoice.paid': {
      if (!o.subscription && !(o.parent && o.parent.subscription_details)) return 'skipped: not a subscription invoice';
      return recordGift(store, { ref: o.id, paymentIntent: o.payment_intent, amount: o.amount_paid, name: o.customer_name, email: o.customer_email,
        label: o.billing_reason === 'subscription_create' ? 'Sponsor every week (first week)' : 'Sponsor every week' });
    }
    // Refunds: remove a fully refunded gift, reduce a partial one.
    case 'charge.refunded': {
      if (!o.payment_intent) return 'skipped: no payment intent';
      const rows = await store.find(`stripe_payment_intent=eq.${encodeURIComponent(o.payment_intent)}`);
      if (!rows.length) return 'skipped: no matching gift';
      const kept = (o.amount || 0) - (o.amount_refunded || 0);
      if (kept <= 0) { await store.remove(rows[0].id); return 'removed'; }
      await store.update(rows[0].id, { amount_cents: kept });
      return 'reduced';
    }
    default:
      return `ignored: ${event.type}`;
  }
}
