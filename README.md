# BNC Motors website

The updated BNC Motors website: a static site (HTML, CSS, JavaScript and images). No build step is needed to host it.

## Pages

| Page | File |
|---|---|
| Challenger (landing page, 3D) | `index.html` |
| Book Now (models, prices, dealers) | `buy.html` |
| Messenger C110 | `messenger.html` |
| Etrol battery | `etrol.html` |
| About | `about.html` |
| B2B: fleets and leasing | `business.html` |
| Careers | `bnc_motors_careers.html` |
| News | `bnc_motors_news.html` |
| Blog and articles | `bnc_blog_page.html`, `bnc_blog_info_page__info_*.html` |
| Privacy policy, Terms | `privacy_policy.html`, `terms_and_condition.html` |
| Challenger full specs | `challenger.html` |
| Enquiry forms (old design) | `customer_enquiry.html`, `dealer_enquiry.html` |

## Run it locally

Serve the folder with any static server, for example:

```
npx serve .
```

Then open the address it prints. The 3D bike on the landing page needs a server; it does not load from a `file://` address.

## Hosting

Upload the folder as it is to any static host. `netlify.toml` asks search engines not to index the site while it is in review; remove that header before the public launch.

## Forms

The four forms (booking, fleet, careers, dealer) send from the page through `assets_v4/next/forms.js`, in this order:

1. **Supabase**, once `assets_v4/next/forms-config.js` holds the project URL and its publishable key. Run `supabase/setup.sql` once in the project (SQL Editor) to create the table `bnc_form_entries` and the private bucket `bnc-resumes`. The website can only add rows and files; it cannot read them.
2. **Netlify forms**, while Supabase is not set up (only when the site is hosted on Netlify).
3. **The visitor's own email**, opened with the answers filled in, as the last resort on any host.

Never put a secret or service_role key in `forms-config.js`.

## Notes

- Shared styles and scripts for the new pages are in `assets_v4/next/`.
- The 3D model is `assets_v4/model/challenger_c.glb`.
- Light is the default look; the round switch in the top bar turns a page dark and the choice is kept across pages.
