// Stripe Payment Links for every giving button on the site (Donate, Rally Point sponsor page).
// In Stripe: Payment Links > New, then paste each https://buy.stripe.com/... URL below.
// Until a link is filled in, its button becomes "Pledge this gift" and opens the pledge form.
window.STS_GIVE = {
  "week": "",    // $350 one time: one week for one veteran
  "month": "",   // $1,400 one time: four weeks for one veteran
  "weekly": "",  // $350 a week, recurring (billed monthly in Stripe)
  "custom": ""   // one time, donor chooses the amount
};
