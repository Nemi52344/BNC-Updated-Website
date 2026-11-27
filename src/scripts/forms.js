/* BNC forms: a form sends its answers from the page and then says so.
   Where the answers go, in this order:
     1. Supabase, when forms-config.js holds a project URL and its publishable key: one row per entry in the table
        bnc_form_entries, the résumé file (careers) in the private bucket bnc-resumes. The website can only ADD rows
        and files; it cannot read them (see supabase/setup.sql).
     2. Netlify forms, when Supabase is not set up or does not answer (the forms carry data-netlify="true").
     3. The visitor's own email, opened with the answers filled in, so no enquiry is lost on any host. */
(function () {
  'use strict';
  var CFG = window.BNC_FORMS || {};
  function tick() {
    return '<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="22" cy="22" r="20"/><path d="M13.5 22.5l6 6 11-12.5"/></svg>';
  }
  function done(form, title, text) {
    var box = document.createElement('div'); box.className = 'sent'; box.setAttribute('role', 'status');
    var h = document.createElement('h3'), p = document.createElement('p');
    h.textContent = title; h.tabIndex = -1; p.textContent = text;
    box.innerHTML = tick(); box.appendChild(h); box.appendChild(p);
    form.appendChild(box); form.classList.add('is-sent');
    try { h.focus({ preventScroll: true }); box.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
  }
  function uid() { try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2, 12); } }
  function safeName(n) { return String(n || 'file').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80); }

  /* 1. Supabase: the file first (if any), then the row */
  function toSupabase(form, fd) {
    var SB = String(CFG.SUPABASE_URL).replace(/\/+$/, ''), KEY = CFG.SUPABASE_KEY, H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
    var row = { form: form.getAttribute('name'), page: location.pathname, answers: {} }, file = null;
    fd.forEach(function (v, k) { if (k === 'form-name' || k === 'bot-field') return;
      if (typeof v === 'string') { if (v.trim()) row.answers[k] = v.trim(); } else if (v && v.size) file = v; });
    ['name', 'mobile', 'email', 'city'].forEach(function (k) { row[k] = row.answers[k] || null; });
    var up = Promise.resolve(null);
    if (file) { var path = row.form + '/' + uid() + '-' + safeName(file.name);
      up = fetch(SB + '/storage/v1/object/' + CFG.BUCKET + '/' + path, { method: 'POST', headers: Object.assign({ 'Content-Type': file.type || 'application/octet-stream' }, H), body: file })
        .then(function (r) { if (!r.ok) throw new Error('file not stored: ' + r.status); return path; }); }
    return up.then(function (path) { if (path) { row.file_path = path; row.file_name = file.name; }
      return fetch(SB + '/rest/v1/' + CFG.TABLE, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, H), body: JSON.stringify(row) });
    }).then(function (r) { if (!r.ok) throw new Error('entry not stored: ' + r.status); });
  }
  /* 2. Netlify forms */
  function toNetlify(form, fd) {
    /* Netlify removes the data-netlify attribute from the page it serves, so look for the hidden form-name field instead */
    if (!form.querySelector('input[name="form-name"]')) return Promise.reject(new Error('not a Netlify form'));
    var hasFile = false, req = { method: 'POST' };
    [].forEach.call(form.querySelectorAll('input[type="file"]'), function (i) { if (i.files && i.files.length) hasFile = true; });
    if (hasFile) req.body = fd;                                       /* a file goes as it is; the browser sets the type */
    else { var pairs = []; fd.forEach(function (v, k) { if (typeof v === 'string') pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); });
      req.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; req.body = pairs.join('&'); }
    return fetch(form.getAttribute('action') || '/', req).then(function (r) { if (!r.ok) throw new Error('not sent: ' + r.status); });
  }

  /* opts: title, text (shown once it is sent); mail: { to, subject, body } used only if the page cannot send */
  function send(form, opts) {
    var btn = form.querySelector('[type="submit"]'), label = btn ? btn.textContent : '';
    var err = form.querySelector('.err');
    var fd = new FormData(form);
    if (String(fd.get('bot-field') || '').trim()) { done(form, opts.title, opts.text); return Promise.resolve(true); }   /* a robot filled the trap: thank it, store nothing */
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    var first = (CFG.SUPABASE_URL && CFG.SUPABASE_KEY) ? toSupabase(form, fd).catch(function () { return toNetlify(form, fd); }) : toNetlify(form, fd);
    return first.then(function () { done(form, opts.title, opts.text); return true; }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (opts.mail) {
        if (err) err.textContent = 'We could not send this from the page. Your email has opened with your answers filled in: please press send there.';
        location.href = 'mailto:' + opts.mail.to + '?subject=' + encodeURIComponent(opts.mail.subject) + '&body=' + encodeURIComponent(opts.mail.body);
      } else if (err) err.textContent = 'We could not send this just now. Please try again, or call +91 422 4722561.';
      return false;
    });
  }
  window.BNCForm = { send: send };
})();
