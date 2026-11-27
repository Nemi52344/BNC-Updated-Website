/* The statements. Every heading marked data-words is split into words (the heading keeps its full text for screen
   readers). The mission's words rise in by themselves; the vision's and the ambition's are lit by the scroll while
   their screen holds. With reduced motion nothing here runs and every word is simply there. */
(function(){
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function split(el){
    var n = 0, full = el.textContent.replace(/\s+/g,' ').trim();
    (function walk(node){
      [].slice.call(node.childNodes).forEach(function(c){
        if (c.nodeType === 3){
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function(t){
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.textContent = t; w.style.setProperty('--i', n++); w.setAttribute('aria-hidden','true'); frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
    el.setAttribute('aria-label', full);
    return [].slice.call(el.querySelectorAll('.w'));
  }
  var heads = [].slice.call(document.querySelectorAll('[data-words]'));
  var words = heads.map(split);
  if (calm) return;
  var who = document.querySelector('.who__say'), by = document.querySelector('.who__by');
  var scenes = [].slice.call(document.querySelectorAll('[data-say]')).map(function(sc){ return { el: sc, ws: [].slice.call(sc.querySelectorAll('.w')) }; });
  var tick = false;
  function paint(){
    tick = false; var vh = innerHeight;
    /* the mission eases away as the page leaves it */
    var p0 = Math.min(1, Math.max(0, scrollY / (vh * .7)));
    who.style.opacity = (1 - p0).toFixed(3); who.style.transform = 'translateY(' + (-p0 * 48).toFixed(1) + 'px) scale(' + (1 - p0 * .04).toFixed(4) + ')';
    by.style.opacity = (1 - Math.min(1, p0 * 2)).toFixed(3);
    scenes.forEach(function(s){
      var r = s.el.getBoundingClientRect();
      var p = (vh * .55 - r.top) / (r.height - vh * .45); p = Math.min(1, Math.max(0, p));
      var q = Math.min(1, Math.max(0, (p - .12) / .6)) * (s.ws.length + .5);
      s.ws.forEach(function(w, i){ var o = Math.min(1, Math.max(0, q - i)); w.style.setProperty('--o', (.14 + o * .86).toFixed(3)); });
      s.el.classList.toggle('done', p > .74);
    });
  }
  function ask(){ if (!tick){ tick = true; requestAnimationFrame(paint); } }
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); paint();
})();
