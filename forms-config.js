// Where form submissions go.
// Leave endpoint empty and each form opens a pre-filled email to the inbox below.
// Set endpoint to an HTTPS URL that accepts a JSON POST (a Supabase Edge Function, Formspree, etc.)
// and forms submit directly, with loading and error states.
window.STS_FORMS = {
  endpoint: "",
  inbox: "contact@servicetostability.org",
  phone: "931-324-4070"
};
