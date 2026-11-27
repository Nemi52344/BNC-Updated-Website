# BNC Motors website

The BNC Motors website. A static site: plain HTML, CSS and JavaScript, organised into folders and put together by one small build script. There is no framework and nothing to install.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer.

```
node build.js --serve
```

This builds the site into `dist/` and serves it at http://localhost:8084. To build without serving, run `node build.js`.

## What is where

```
src/
  pages/          one file per page: its facts at the top, then its content
    index.html              /                     Challenger landing page (3D)
    book-now.html           /book-now/            models, prices, dealers, booking form
    messenger.html          /messenger/
    etrol.html              /etrol/
    about.html              /about/
    b2b.html                /b2b/                 fleets, leasing, AMC, fleet form
    careers.html            /careers/             application form
    become-a-dealer.html    /become-a-dealer/     dealer form
    news.html               /news/
    blog/index.html         /blog/
    blog/<article>.html     /blog/<article>/
    challenger-specs.html   /challenger-specs/
    privacy-policy.html     /privacy-policy/
    terms.html              /terms/
  layouts/site.html   the document every standard page is placed in (head, header, footer, scripts)
  partials/           header.html and footer.html, written once and shared
  styles/
    base.css          the design system: colours, type, buttons, top bar, footer, forms
    pages/            one stylesheet per page (blog.css and legal.css are shared by several pages)
  scripts/
    site.js           what every page shares: light / dark switch, menu, entrances
    forms.js          sends the four forms (see "Forms")
    forms-config.js   where the forms send to
    etrol3d.js        the 3D battery on the Etrol page
    landing/          the 3D bike on the landing page
    pages/            one script per page
public/               copied to the site as it is
  assets/img/         pictures, by section (home, etrol, business, messenger_v2, challenger_v3 ...)
  assets/model/       the 3D models
  assets/docs/        the brochure
  assets/vendor/      third-party and older files that two pages still use (see "Older pages")
redirects.json        old addresses and where each one leads now
supabase/setup.sql    the database table for the forms, for when they move to Supabase
build.js              the build
dist/                 the built site (not kept in git)
```

## A page

A standard page looks like this:

```
---
title: About BNC Motors
description: One or two sentences for search engines.
nav: about                      which top-bar link is marked as the current page
footnote: Pricing is ex-showroom and subject to change prior to delivery.
styles: pages/about.css
scripts: pages/about.js
---
<main id="main">
  ...
</main>
```

The build wraps it in `src/layouts/site.html`, which adds the head, the header and the footer. To add a page, create a file in `src/pages/`; `team.html` is served at `/team/`.

Links and files are written from the site's root: `/book-now/`, `/assets/img/home/ride-rock-1600.webp`.

Optional lines: `ogTitle`, `ogDescription`, `modules` (scripts loaded as modules), and a `<!--head--> ... <!--/head-->` block for anything else a page needs in its head.

## What the build does

1. Places each page in its layout and writes it to `dist/<address>/index.html`.
2. Copies `src/styles` to `dist/assets/css`, `src/scripts` to `dist/assets/js`, and `public` as it is.
3. Adds `?v=<content hash>` to every link to our own CSS and JavaScript, so a changed file is never served from a visitor's cache.
4. Writes a forwarding page and a Netlify redirect for every old address in `redirects.json`.
5. Checks that every link, picture, stylesheet and script named in the built site exists. The build fails with a list if one does not.

## Forms

The four forms (booking, fleet, careers, dealer) send from the page through `src/scripts/forms.js`, in this order:

1. **Supabase**, once `src/scripts/forms-config.js` holds the project URL and its publishable key. Run `supabase/setup.sql` once in the project's SQL Editor to create the table `bnc_form_entries` and the private bucket `bnc-resumes`. The website can only add rows and files; it cannot read them.
2. **Netlify forms**, while Supabase is not set up. This works only when the site is hosted on Netlify.
3. **The visitor's own email**, opened with the answers filled in, as the last resort on any host.

Never put a secret or service_role key in `forms-config.js`.

## Hosting

Any static host can serve `dist/`. On Netlify, `netlify.toml` runs the build and publishes `dist/`. It also asks search engines not to index the site while it is in review; remove that header before the public launch.

Old addresses such as `/buy.html` or `/bnc_motors_news` are forwarded to the new ones (`redirects.json`).

## Older pages

Three pages keep their own document instead of the shared layout (`layout: none` at the top of the file):

- `index.html`, the 3D landing page: it has its own top bar and stage. It still uses the shared footer.
- `messenger.html`: an earlier design with its own header and footer, built on Bootstrap.
- `challenger-specs.html`: an earlier page that uses the component kit in `public/assets/vendor/kit/`. Its scripts are still written inside the page.

`public/assets/vendor/legacy/` holds the Bootstrap, jQuery and icon-font files those pages load.

## Appearance

Light is the default. The round switch in the top bar turns a page dark and the choice is kept across pages (`localStorage['reveal-theme']`). Adding `?theme=dark` or `?theme=light` to an address forces one for checking.
