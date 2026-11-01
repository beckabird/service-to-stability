// Stripe Payment Links for every giving button on the site (Donate, Rally Point sponsor page).
// In Stripe: Payment Links > New, then paste each https://buy.stripe.com/... URL below.
// Until a link is filled in, its button becomes "Pledge this gift" and opens the pledge form.
window.STS_GIVE = {
  "week": "https://buy.stripe.com/6oUcN4gVJdajgsQ96c4wM00",    // $226 one time: one week for one veteran
  "month": "https://buy.stripe.com/cNi3cu5d1eenccA1DK4wM01",   // $904 one time: four weeks for one veteran
  "weekly": "https://buy.stripe.com/aFa00ibBpb2bekIgyE4wM02",  // $226 a week, recurring weekly
  "custom": "https://donate.stripe.com/bJe5kCgVJ9Y7a4sgyE4wM03"   // one time, donor chooses the amount
};
