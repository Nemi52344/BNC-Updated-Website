/* BNC forms (2026-11-27): a form sends its answers from the page and then says so.
   The forms are Netlify forms (data-netlify="true" in the HTML): the host stores each entry. If the page is served from
   a host that does not take the entry, the visitor's own email opens with the same answers filled in, so no enquiry is
   lost. To send the entries somewhere else later, change the address in send() below (one place). */
(function () {
  'use strict';
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
  /* opts: title, text (shown once it is sent); mail: { to, subject, body } used only if the page cannot send */
  function send(form, opts) {
    var btn = form.querySelector('[type="submit"]'), label = btn ? btn.textContent : '';
    var err = form.querySelector('.err');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    var fd = new FormData(form), hasFile = false, req = { method: 'POST' };
    [].forEach.call(form.querySelectorAll('input[type="file"]'), function (i) { if (i.files && i.files.length) hasFile = true; });
    if (hasFile) req.body = fd;                                       /* a file goes as it is; the browser sets the type */
    else { var pairs = []; fd.forEach(function (v, k) { if (typeof v === 'string') pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); });
      req.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; req.body = pairs.join('&'); }
    return fetch(form.getAttribute('action') || '/', req).then(function (r) {
      if (!r.ok) throw new Error('not sent: ' + r.status);
      done(form, opts.title, opts.text); return true;
    }).catch(function () {
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
