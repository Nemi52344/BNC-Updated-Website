/* the reading bar, the section the reader is in, and the two share buttons */
(function(){
  var bar=document.getElementById('bar'), art=document.querySelector('.post__body'), links=[].slice.call(document.querySelectorAll('.toc a'));
  var heads=links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
  function tick(){ var r=art.getBoundingClientRect(), h=r.height-innerHeight*.6, d=Math.min(1,Math.max(0,(innerHeight*.4-r.top)/(h>0?h:1)));
    bar.style.transform='scaleX('+d+')'; var on=-1; for(var i=0;i<heads.length;i++){ if(heads[i] && heads[i].getBoundingClientRect().top<innerHeight*.4) on=i; }
    links.forEach(function(a,i){ a.classList.toggle('on',i===on); }); }
  addEventListener('scroll',tick,{passive:true}); addEventListener('resize',tick); tick();
  var wa=document.getElementById('sh-wa'); if(wa) wa.href='https://wa.me/?text='+encodeURIComponent(document.title.replace(' | BNC Motors blog','')+' '+location.href.split('#')[0]);
  var cp=document.getElementById('sh-cp'); if(cp) cp.addEventListener('click',function(){ var u=location.href.split('#')[0], done=function(){ cp.setAttribute('aria-label','Link copied'); cp.style.borderColor='var(--ink)'; };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done,function(){}); });
})();
