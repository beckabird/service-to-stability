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
| `donate-config.js` | Paste Stripe Payment Link URLs here to turn on online giving |
| `rally-point/` | The Rally Point House site (8 pages, served at /rally-point); `rally-point/give-config.js` holds its Stripe links |
| `styles.css` | Shared styles (brand tokens at the top) |
| `assets/` | White logo lockups for the navy header and footer |

## Deploy

Vercel: import this repo, framework preset **Other**, no build command, output directory `.` (root).

## Turning on donations

1. In Stripe, create four Payment Links: $720/month recurring (Sponsor a bed), $180/month recurring (Share a bed), $24 one time (One night), and one time with "customer chooses amount" (Fund the house).
2. Paste each `https://buy.stripe.com/...` URL into `donate-config.js` and push. Buttons switch from "Pledge this gift" to live checkout automatically.

## Before launch

- The founding-list form on `get-involved.html` only shows a thank-you message; connect it to a form service (Formspree, Tally, Google Forms) so submissions are saved.
- Figures (34,000 veterans, ≈4,500 Fort Campbell separations, 31% stay local) and budget numbers are planning estimates; keep them in sync with the brand guide.
