/* BNC next site: the small behaviours every page shares. No dependencies. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* light / dark switch: light by default on these pages; the choice is kept (same key as the Challenger 3D page) */
  var mode = document.getElementById('mode');
  function applyMode() {
    var light = root.dataset.theme !== 'dark';
    if (mode) mode.setAttribute('aria-pressed', String(!light));
    var tc = document.getElementById('theme-color'); if (tc) tc.content = light ? '#f4f4f2' : '#08090a';
    document.dispatchEvent(new CustomEvent('bnc:theme'));
  }
  if (mode) mode.addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next; try { localStorage.setItem('reveal-theme', next); } catch (e) {}
    applyMode();
  });
  applyMode();

  /* top bar gets a ground once the page has moved */
  var nav = document.querySelector('.nav');
  function stick() { if (nav) nav.classList.toggle('stuck', window.scrollY > 24); }
  window.addEventListener('scroll', stick, { passive: true }); stick();

  /* odometer figures: each digit is a strip of 0-9 that rolls to its number when the group comes into view */
  function buildRoll(box) {
    if (reduce) return;
    box.querySelectorAll('[data-roll]').forEach(function (el, k) {
      var digits = String(el.dataset.roll).split(''); el.textContent = '';
      digits.forEach(function (ch, i) {
        if (!/[0-9]/.test(ch)) { el.appendChild(document.createTextNode(ch)); return; }
        var od = document.createElement('span'); od.className = 'od'; od.setAttribute('aria-hidden', 'true');
        var strip = document.createElement('span'); strip.className = 'od__strip';
        strip.style.setProperty('--d', ch); strip.style.setProperty('--w', (k * 0.14 + i * 0.07) + 's');
        for (var n = 0; n < 10; n++) { var b = document.createElement('b'); b.textContent = n; strip.appendChild(b); }
        od.appendChild(strip); el.appendChild(od);
      });
    });
  }
  var rolls = [].slice.call(document.querySelectorAll('[data-rolls]'));
  function roll(box) {                               /* built only at the moment it runs, so a number is never left at 000 */
    if (box.dataset.rolled) return; box.dataset.rolled = '1'; buildRoll(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('go'); }); });
    setTimeout(function () { box.classList.add('go'); }, 300);
  }

  /* entrances */
  var ins = [].slice.call(document.querySelectorAll('[data-in]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.hasAttribute('data-rolls')) roll(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    ins.forEach(function (el) { io.observe(el); });
    rolls.forEach(function (el) { if (!el.hasAttribute('data-in')) io.observe(el); });
    setTimeout(function () {                       /* nothing stays hidden if frames are held back */
      ins.forEach(function (el) { el.classList.add('in'); });
    }, 900);
  } else { ins.forEach(function (el) { el.classList.add('in'); }); }
})();
