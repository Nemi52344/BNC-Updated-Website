/* the light / dark switch: same key as the rest of the site, so the choice follows the visitor from page to page */
(function(){
	var root=document.documentElement, b=document.getElementById('mode'); if(!b) return;
	function show(){ b.setAttribute('aria-pressed', String(root.dataset.theme==='dark')); }
	b.addEventListener('click',function(){ var next=root.dataset.theme==='dark'?'light':'dark'; root.dataset.theme=next; try{localStorage.setItem('reveal-theme',next);}catch(e){} show(); });
	show();
})();

var stb=document.getElementById("scroll-top-button");
	window.onscroll=function(){stb.style.display=(document.documentElement.scrollTop>400)?"block":"none";};
	stb.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};

/* ===== Messenger page animations: count-up stats + scroll reveal ===== */
(function(){
	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---- count-up for the stat numbers ---- */
	function animateCount(el){
		var raw = el.getAttribute('data-target') || el.textContent.trim();
		el.setAttribute('data-target', raw);
		var prefix = (raw.match(/^[^0-9]*/) || [''])[0];
		var to = parseInt(raw.replace(/[^0-9]/g,''), 10);
		if(!to){ return; }
		var from = parseInt(el.getAttribute('data-from'), 10); if(isNaN(from)){ from = 0; }
		var snapStep = parseInt(el.getAttribute('data-step'), 10); if(isNaN(snapStep) || snapStep < 1){ snapStep = 1; }
		var dur = parseInt(el.getAttribute('data-dur'), 10) || 1700;
		function snap(v){ return Math.round((v - to) / snapStep) * snapStep + to; } /* keeps the unchanging digits locked */
		if(reduce){ el.textContent = prefix + to.toLocaleString('en-IN'); return; }
		var start = null;
		el.textContent = prefix + snap(from).toLocaleString('en-IN');
		function frame(ts){
			if(start === null) start = ts;
			var p = Math.min((ts - start) / dur, 1);
			var eased = 1 - Math.pow(1 - p, 3);
			var cur = from + (to - from) * eased;
			el.textContent = prefix + snap(cur).toLocaleString('en-IN');
			if(p < 1){ requestAnimationFrame(frame); }
			else { el.textContent = prefix + to.toLocaleString('en-IN'); }
		}
		requestAnimationFrame(frame);
	}
	var statsSection = document.querySelector('.mz-stats');
	if(statsSection){
		var statObs = new IntersectionObserver(function(entries){
			entries.forEach(function(e){
				if(!e.isIntersecting){ return; }
				statObs.unobserve(e.target);
				var nums = e.target.querySelectorAll('.num');
				var maxDur = 0;
				nums.forEach(function(n){
					animateCount(n);                                   /* all fire at the same time */
					var d = parseInt(n.getAttribute('data-dur'), 10) || 1700;
					if(d > maxDur){ maxDur = d; }
				});
				if(!reduce){ setTimeout(function(){ e.target.classList.add('shine'); }, maxDur + 120); } /* white shine after loading */
			});
		}, {threshold:0.45});
		statObs.observe(statsSection);
	}

	/* ---- scroll reveal ---- */
	var groups = [
		{sel:'.mz-stat', cls:'reveal', staggerIn:'.mz-stats .grid'},
		{sel:'.mz-carry-overlay .eyebrow, .mz-carry-overlay h2, .mz-carry-overlay p, .mz-carry-overlay .mz-btn', cls:'reveal', staggerIn:'.mz-carry-overlay'},
		{sel:'.mz-feat-media', cls:'reveal-z'},
		{sel:'.mz-feat-text', cls:'reveal'},
		{sel:'.mz-card', cls:'reveal-z', staggerIn:'.mz-grid3'},
		{sel:'.mz-grid3 + *, .mz-specs .eyebrow, .mz-specs h2', cls:'reveal'},
		{sel:'.mz-specrow', cls:'reveal', staggerIn:'.mz-spectable'},
		{sel:'.mz-cta .eyebrow, .mz-cta .price, .mz-cta .sub, .mz-cta .mz-btn', cls:'reveal', staggerIn:'.mz-cta .wrap'},
		{sel:'.mz-footer .row1 > div', cls:'reveal', staggerIn:'.mz-footer .row1'},
		{sel:'.mz-gallery-cta .mz-btn', cls:'reveal'}
	];
	var io = new IntersectionObserver(function(entries){
		entries.forEach(function(e){
			if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
		});
	}, {threshold:0.16, rootMargin:'0px 0px -7% 0px'});

	groups.forEach(function(g){
		document.querySelectorAll(g.sel).forEach(function(el){
			el.classList.add(g.cls);
			var r = el.getBoundingClientRect();
			if(r.top < (window.innerHeight*0.92) && r.bottom > 0){ el.classList.add('in'); } // already visible -> show now (no flash)
			else { io.observe(el); }
		});
	});
	/* stagger delays within groups */
	[['.mz-grid3','.mz-card'],['.mz-spectable','.mz-specrow'],['.mz-carry-overlay','.reveal'],['.mz-footer .row1','> div']].forEach(function(pair){
		document.querySelectorAll(pair[0]).forEach(function(p){
			var kids = pair[1]==='> div' ? p.children : p.querySelectorAll(pair[1]);
			Array.prototype.forEach.call(kids, function(c,i){ c.style.transitionDelay = (i*0.09)+'s'; });
		});
	});
})();
