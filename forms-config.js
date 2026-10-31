// Where form submissions go.
// supabaseUrl + supabaseKey set: forms save straight to the staff inbox (see /staff).
// The key is the project's public "publishable" key; the database only lets the public add a submission, never read one.
// If both are empty and endpoint is empty, each form opens a pre-filled email to the inbox below instead.
window.STS_FORMS = {
  supabaseUrl: "https://eatrpzvogytrcpnprvby.supabase.co",
  supabaseKey: "sb_publishable_NGZHmYkyfbmBiTMPqXy6rw_m7aT15MZ",
  endpoint: "",
  inbox: "contact@servicetostability.org",
  phone: "931-324-4070"
};
