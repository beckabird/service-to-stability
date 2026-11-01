# The Service to Stability Project — website

Pre-launch site for The Service to Stability Project: free, structured, sober transitional housing for veterans in Clarksville, Tennessee.

Plain static HTML and CSS. No build step.

| File | Page |
| --- | --- |
| `index.html` | Home |
| `the-house.html` | The house, the path, what residents get |
| `sponsor.html` | Sponsor a bed, budget, property ask |
| `roadmap.html` | Roadmap |
| `faq.html` | FAQ |
| `get-involved.html` | Founding-list form and contact details |
| `donate.html` | Donate page (Stripe Payment Links) |
| `donate-config.js` | Stripe Payment Link URLs for every giving button on the site |
| `give.js` | Wires `data-give` buttons to those links, or to the pledge form when a link is empty |
| `forms-config.js` | Where form submissions go: an HTTPS endpoint, or a pre-filled email to the inbox |
| `404.html` | Branded not-found page (Vercel serves it for any missing URL) |
| `favicon.ico`, `favicon.svg`, `assets/icons/`, `site.webmanifest` | Favicon set and app icons from the logo mark |
| `assets/og-*.png` | 1200×630 share images for links on social and in messages |
| `staff.html`, `staff.js`, `staff.css` | Staff inbox at /staff: magic-link sign-in, submissions, gifts, goal and staff list (not linked publicly, not indexed) |
| `progress.js` | Live fundraising meter and bed board on /sponsor |
| `site.js` | Every page: start at the top, mobile menu (Escape and outside tap close it), scroll reveal below the fold |
| `assets/fonts/` | Source Sans 3, self-hosted (SIL Open Font License in `OFL.txt`) |
| `forms.js` | Validation, errors, loading, success and failure states for every `data-form` form |
| `rally-point/` | The Rally Point House site (8 pages, served at /rally-point) |
| `styles.css` | Shared styles (brand tokens at the top) |
| `assets/` | White logo lockups for the navy header and footer |

## Deploy

Vercel: import this repo, framework preset **Other**, no build command, output directory `.` (root).

Live at **https://www.project-pledge.com** (Vercel project `service-to-stability`; the apex `project-pledge.com` 308-redirects to `www`). Every push to `main` deploys to production.

- Internal links are root-absolute clean URLs (`/sponsor`, `/rally-point/the-house`). Keep it that way: `vercel.json` sets `trailingSlash: false`, so relative links inside `rally-point/` would resolve against `/` and break.
- Each page carries a canonical and `og:url` on `www.project-pledge.com`; `sitemap.xml` lists every page. Add new pages to both.
- Local preview: `npx serve` from the repo root (opening files directly won't resolve root-absolute paths).

## Turning on donations

1. In Stripe, create four Payment Links: $226 one time (week), $904 one time (month), $226 a week recurring (weekly), and one time with "customer chooses amount" (custom).
2. Paste each `https://buy.stripe.com/...` URL into `donate-config.js` and push. Buttons switch from "Pledge this gift" to live checkout automatically.

## Before launch

- Forms (founding list on `/get-involved`, opening list on `/rally-point/refer`) validate in the browser. With `forms-config.js` endpoint empty, a valid submission opens a pre-filled email to the inbox and shows the message to copy. Set `endpoint` to a URL that accepts a JSON POST to submit directly; the payload is `{ form, page, submitted_at, fields }`.
- Figures (34,000 veterans, ≈4,500 Fort Campbell separations, 31% stay local) and budget numbers are planning estimates; keep them in sync with the brand guide.

## Drafts

`drafts/` is excluded from deploys by `.vercelignore`, so nothing in it is ever live. `drafts/pickup-game.html` is the Rally Point Pickup Game concept page (shared privately, not on the site). `/pickup` temporarily redirects home. To launch it: move it to the repo root as `pickup.html`, drop the concept banner and noindex tag, add it back to the footers and `sitemap.xml`, and remove the redirect from `vercel.json`.

## Database (Supabase, via Vercel Marketplace)

Project `eatrpzvogytrcpnprvby` in the "beckabird's projects" Supabase org, connected to the Vercel project.

- `submissions`: every founding-list and Rally Point form entry. The public can insert only; it can never read, edit or delete.
- `gifts`: pledges and gifts staff record. Drives the meter and bed board on /sponsor.
- `settings`: the founding goal (`goal_cents`).
- `staff`: emails allowed into /staff. Manage it from Settings in the inbox.
- `fundraising_progress()`: the one public read. Returns totals and bed credits a sponsor agreed to show; no contact details.

`forms-config.js` holds the project URL and the public publishable key. That key is safe in the browser: row level security decides what it can do. Never put the service role or secret key in this repo.

## Editing the header, crisis strip or footer

They are shared by every page. Edit the file in `layout/` (`main-*` for the main site, `rally-point-*` for /rally-point), then run:

```
python3 tools/sync_layout.py
```

It rewrites every page and marks the current page in the nav. `python3 tools/sync_layout.py --check` reports any page that has drifted without changing anything. `layout/` and `tools/` are not deployed.

## Stripe gifts flow into the inbox automatically

`supabase/functions/stripe-webhook` (deployed to the Supabase project as `stripe-webhook`) receives Stripe events, checks Stripe's signature with the `STRIPE_WEBHOOK_SECRET` function secret, and writes `public.gifts`:

- `checkout.session.completed` (one-time gifts) and `invoice.paid` (each week of a recurring gift) add a received gift, tagged Stripe, with the donor's email (staff only).
- `charge.refunded` removes a fully refunded gift or reduces a partial one.
- Stripe retries are safe: each Checkout Session or Invoice is recorded once.

Stripe webhook endpoint: `https://eatrpzvogytrcpnprvby.supabase.co/functions/v1/stripe-webhook`
