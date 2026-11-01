import { handleEvent, verifyStripeSignature } from './handler.js';

const env = {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!secret) return new Response('Webhook secret not configured', { status: 500 });
  const raw = await req.text();
  const ok = await verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret, Math.floor(Date.now() / 1000));
  if (!ok) return new Response('Invalid signature', { status: 400 });
  try {
    const result = await handleEvent(JSON.parse(raw), env, fetch);
    console.log(JSON.stringify({ type: JSON.parse(raw).type, result }));
    return new Response(JSON.stringify({ received: true, result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(String(e));
    return new Response('Could not record the gift; Stripe will retry.', { status: 500 });
  }
});
