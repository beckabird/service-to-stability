// SANDBOX (test mode) links on the stripe-sandbox preview branch only. Never merge to main.
// Stripe Payment Links for every giving button on the site (Donate, Rally Point sponsor page).
// In Stripe: Payment Links > New, then paste each https://buy.stripe.com/... URL below.
// Until a link is filled in, its button becomes "Pledge this gift" and opens the pledge form.
window.STS_GIVE = {
  "week": "https://buy.stripe.com/test_7sY3cx3CY8fO9YD8OU2B200",    // $226 one time: one week for one veteran
  "month": "https://buy.stripe.com/test_fZufZj5L62Vub2H4yE2B201",   // $904 one time: four weeks for one veteran
  "weekly": "https://buy.stripe.com/test_cNi14p8Xicw41s72qw2B202",  // $226 a week, recurring (billed monthly in Stripe)
  "custom": "https://buy.stripe.com/test_eVqaEZddygMkc6L0io2B203"   // one time, donor chooses the amount
};
