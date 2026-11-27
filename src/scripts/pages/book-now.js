/* first screen: three pictures slide across in turn; the dots choose one; a swipe works too */
(function(){
  var box=document.getElementById('hero-slides'), dots=[].slice.call(document.querySelectorAll('#hero-dots button')); if(!box) return;
  var track=box.firstElementChild, n=track.children.length, cur=0, timer=0, still=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function go(i){ cur=(i+n)%n; track.style.transform='translateX('+(-100*cur)+'%)';
    dots.forEach(function(d,k){ d.setAttribute('aria-pressed',String(k===cur)); });
    var im=track.children[cur].querySelector('img'), nx=track.children[(cur+1)%n].querySelector('img'); if(im) im.loading='eager'; if(nx) nx.loading='eager'; }
  function play(){ stop(); if(!still) timer=setInterval(function(){ go(cur+1); },5200); }
  function stop(){ clearInterval(timer); timer=0; }
  dots.forEach(function(d,k){ d.addEventListener('click',function(){ go(k); play(); }); });
  var x0=null; box.addEventListener('pointerdown',function(e){ x0=e.clientX; });
  box.addEventListener('pointerup',function(e){ if(x0===null) return; var dx=e.clientX-x0; x0=null; if(Math.abs(dx)>48){ go(cur+(dx<0?1:-1)); play(); } });
  box.addEventListener('pointercancel',function(){ x0=null; });
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) play(); else stop(); }); },{threshold:.3}).observe(box); else play();
  document.addEventListener('visibilitychange',function(){ if(document.hidden) stop(); else play(); });
  setTimeout(function(){ var nx=track.children[1].querySelector('img'); if(nx) nx.loading='eager'; },1500);
})();
/* daily round: each picture in turn opens (grows large) from its own place; the one that was open shrinks back into its
   cell and the others slide to make room */
(function(){
  var wall=document.getElementById('wall'); if(!wall) return;
  var figs=[].slice.call(wall.children).filter(function(x){ return getComputedStyle(x).display!=='none'; }), n=figs.length;
  var cur=Math.max(0,figs.findIndex(function(x){ return x.classList.contains('on'); })), big=wall.dataset.big||'';
  var still=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, EASE='cubic-bezier(.22,.8,.2,1)', MS=950;
  function sharp(k){ var im=figs[k].querySelector('img'); if(im && big && im.sizes!==big) im.sizes=big; }   // an open picture needs the larger file
  function label(){ figs.forEach(function(x,k){ x.setAttribute('aria-pressed',String(k===cur)); x.tabIndex=0; }); }
  function grid(){ var cs=getComputedStyle(wall); return { cols:cs.gridTemplateColumns.split(' ').length, rows:cs.gridTemplateRows.split(' ').length,
    sc:parseInt(cs.getPropertyValue('--sc'),10)||2, sr:parseInt(cs.getPropertyValue('--sr'),10)||2 }; }
  function place(k, r){                                  // the open picture stays on its own cell, pulled in from the edge if it must
    var g=grid(), w=wall.getBoundingClientRect(), c=Math.floor((r.left+r.width/2-w.left)/(w.width/g.cols))+1, row=Math.floor((r.top+r.height/2-w.top)/(w.height/g.rows))+1;
    figs[k].style.setProperty('--c', Math.max(1,Math.min(c, g.cols-g.sc+1))); figs[k].style.setProperty('--r', Math.max(1,Math.min(row, g.rows-g.sr+1))); }
  function fly(el,from,cls){ var to=el.getBoundingClientRect(); if(!to.width||!from.width) return;
    var dx=from.left-to.left, dy=from.top-to.top, sx=from.width/to.width, sy=from.height/to.height;
    if(Math.abs(dx)<1 && Math.abs(dy)<1 && Math.abs(sx-1)<.01 && Math.abs(sy-1)<.01) return;
    var r=parseFloat(getComputedStyle(el).borderTopLeftRadius)||0; if(cls) el.classList.add(cls);
    var a=el.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')',borderRadius:(r/sx)+'px / '+(r/sy)+'px'},{transform:'none',borderRadius:r+'px'}],{duration:MS,easing:EASE});
    a.onfinish=a.oncancel=function(){ if(cls) el.classList.remove(cls); }; }
  function bring(k){ k=(k+n)%n; if(k===cur) return;
    var was=figs.map(function(x){ return x.getBoundingClientRect(); }), old=cur;
    sharp(k); place(k, was[k]);
    figs[old].classList.remove('on'); figs[k].classList.add('on'); cur=k; label();
    if(!still && figs[k].animate) figs.forEach(function(x,i){ fly(x, was[i], i===k ? 'rise' : (i===old ? 'sink' : '')); });
    setTimeout(function(){ sharp((cur+1)%n); },1600); }                   // have the next one ready
  figs.forEach(function(x,k){ var im=x.querySelector('img');
    x.setAttribute('role','button'); x.setAttribute('aria-label','Show picture '+(k+1)+' of '+n+(im&&im.alt?': '+im.alt:''));
    x.addEventListener('click',function(){ bring(k); });
    x.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); bring(k); } }); });
  label();
  var cols=grid().cols; addEventListener('resize',function(){ var g=grid(); if(g.cols!==cols || true){ cols=g.cols;
    var c=parseInt(figs[cur].style.getPropertyValue('--c'),10)||1, r=parseInt(figs[cur].style.getPropertyValue('--r'),10)||1;
    figs[cur].style.setProperty('--c', Math.max(1,Math.min(c, g.cols-g.sc+1))); figs[cur].style.setProperty('--r', Math.max(1,Math.min(r, g.rows-g.sr+1))); } });
  if(still || !('IntersectionObserver' in window)) return;
  /* the line on the open picture runs for --hold; when it is full the next picture opens. Only while on screen */
  wall.addEventListener('animationend',function(e){ if(e.animationName==='wallfill' && e.target===figs[cur]) bring(cur+1); });
  new IntersectionObserver(function(es){ es.forEach(function(e){ wall.classList.toggle('run', e.isIntersecting); if(e.isIntersecting) sharp((cur+1)%n); }); },{threshold:.35}).observe(wall);
})();
/* the two models: one on show at a time */
(function(){
  var cards=[].slice.call(document.querySelectorAll('.family .mcard')); if(cards.length<2) return;
  function show(c){ cards.forEach(function(k){ var on=k===c; k.classList.toggle('on',on);
    var b=k.querySelector('.mcard__mini'); if(b){ b.setAttribute('aria-expanded',String(on)); b.tabIndex=on?-1:0; } }); }
  var t=0, fine=window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches && innerWidth>860;
  cards.forEach(function(k){ var b=k.querySelector('.mcard__mini'); if(!b) return;
    b.addEventListener('click',function(){ show(k); var a=k.querySelector('.mcard__full a'); if(a && document.activeElement===b) a.focus({preventScroll:true}); });
    if(fine){ k.addEventListener('pointerenter',function(){ clearTimeout(t); if(!k.classList.contains('on')) t=setTimeout(function(){ show(k); },140); });
      k.addEventListener('pointerleave',function(){ clearTimeout(t); }); } });
  show(/[?&]model=messenger/.test(location.search) ? cards[1] : (document.querySelector('.family .mcard.on')||cards[0]));
})();
/* colours: a swatch swaps the picture, the band's tint, the name and its line */
(function(){
  var box=document.getElementById('tones'); if(!box) return;
  var btns=[].slice.call(box.querySelectorAll('[data-tone][data-tint]')), imgs=[].slice.call(box.querySelectorAll('.tones__bike img'));
  btns.forEach(function(b){ b.addEventListener('click',function(){
    btns.forEach(function(x){ x.setAttribute('aria-pressed', String(x===b)); });
    imgs.forEach(function(i){ i.classList.toggle('on', i.dataset.tone===b.dataset.tone); if(i.dataset.tone===b.dataset.tone) i.loading='eager'; });
    box.style.setProperty('--tint', b.dataset.tint);
    document.getElementById('tones-name').textContent=b.dataset.name; document.getElementById('tones-line').textContent=b.dataset.line;
  }); });
})();
/* the booking form: check the three fields, send the answers from the page, say thank you in its place.
   A link such as buy.html?bike=messenger#reach arrives with that bike chosen. */
(function(){
  var f=document.getElementById('reach-form'); if(!f) return; var err=document.getElementById('reach-err');
  try{ var want=(new URLSearchParams(location.search).get('bike')||'').toLowerCase(); if(want==='messenger'){ var r=f.querySelector('input[name="model"][value="Messenger"]'); if(r) r.checked=true; } }catch(x){}
  f.addEventListener('submit',function(e){ e.preventDefault(); var d=new FormData(f);
    var name=(d.get('name')||'').trim(), mobile=(d.get('mobile')||'').replace(/[^0-9+]/g,''), city=d.get('city')||'';
    if(name.length<2){ err.textContent='Please enter your name.'; f.elements.name.focus(); return; }
    if(mobile.replace(/\D/g,'').length<10){ err.textContent='Please enter a 10-digit mobile number.'; f.elements.mobile.focus(); return; }
    if(!city){ err.textContent='Please choose your city.'; f.elements.city.focus(); return; }
    err.textContent='';
    BNCForm.send(f,{ title:'Thank you, '+name+'.', text:'We have your details and will connect you with the nearest BNC dealer.',
      mail:{ to:'info@bncmotors.in', subject:'Enquiry: '+d.get('model')+' ('+city+')', body:['Enquiry from the BNC website','','I want to: '+d.get('want'),'Model: '+d.get('model'),'Name: '+name,'Mobile: '+mobile,'City: '+city].join('\n') } });
  });
})();
