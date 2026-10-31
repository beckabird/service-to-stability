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
| `motion.js` | Scroll reveal for content below the fold (skipped under reduced motion); page cross-fades are pure CSS in `styles.css` |
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

1. In Stripe, create four Payment Links: $350 one time (week), $1,400 one time (month), $350 a week recurring (weekly), and one time with "customer chooses amount" (custom).
2. Paste each `https://buy.stripe.com/...` URL into `donate-config.js` and push. Buttons switch from "Pledge this gift" to live checkout automatically.

## Before launch

- Forms (founding list on `/get-involved`, opening list on `/rally-point/refer`) validate in the browser. With `forms-config.js` endpoint empty, a valid submission opens a pre-filled email to the inbox and shows the message to copy. Set `endpoint` to a URL that accepts a JSON POST to submit directly; the payload is `{ form, page, submitted_at, fields }`.
- Figures (34,000 veterans, ≈4,500 Fort Campbell separations, 31% stay local) and budget numbers are planning estimates; keep them in sync with the brand guide.

## Drafts

`drafts/` is excluded from deploys by `.vercelignore`, so nothing in it is ever live. `drafts/pickup-game.html` is the Rally Point Pickup Game concept page (shared privately, not on the site). `/pickup` temporarily redirects home. To launch it: move it to the repo root as `pickup.html`, drop the concept banner and noindex tag, add it back to the footers and `sitemap.xml`, and remove the redirect from `vercel.json`.
