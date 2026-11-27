/* BNC forms: where the entries go.
   Fill in the two values from the Supabase dashboard (Project Settings -> API Keys):
     Project URL      -> SUPABASE_URL
     Publishable key  -> SUPABASE_KEY
   The publishable key is made to be public and is safe in browser code. NEVER put a secret / service_role key here.
   While both are empty the forms keep working as before (Netlify forms, then the visitor's email as the last resort).
   The table and the file bucket are created by supabase/setup.sql. */
window.BNC_FORMS = {
  SUPABASE_URL: '',
  SUPABASE_KEY: '',
  TABLE: 'bnc_form_entries',
  BUCKET: 'bnc-resumes'
};
