import { notify } from './handler.js';

const env = {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  RESEND_API_KEY: Deno.env.get('RESEND_API_KEY') ?? '',
  NOTIFY_FROM: Deno.env.get('NOTIFY_FROM') ?? 'The Service to Stability Project <hello@project-pledge.com>',
  NOTIFY_TO: Deno.env.get('NOTIFY_TO') ?? 'contact@servicetostability.org',
  NOTIFY_REPLY_TO: Deno.env.get('NOTIFY_REPLY_TO') ?? 'contact@servicetostability.org',
  NOTIFY_PHONE: Deno.env.get('NOTIFY_PHONE') ?? '931-324-4070',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  try {
    const { status, result } = await notify(body, env, fetch);
    console.log(JSON.stringify({ table: body.table, result }));
    return new Response(JSON.stringify({ result }), { status, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(String(e));
    return new Response('Could not send', { status: 500 });
  }
});
