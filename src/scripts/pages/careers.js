/* the application form: check the fields, send the answers (and the résumé, if one is chosen) from the page, say thank you */
(function(){
  var f=document.getElementById('career-form'); if(!f) return; var err=document.getElementById('career-err');
  f.addEventListener('submit',function(e){ e.preventDefault(); var d=new FormData(f);
    var v=function(k){ var x=d.get(k); return typeof x==='string' ? x.trim() : ''; };
    var name=v('name'), mobile=v('mobile').replace(/[^0-9+]/g,''), email=v('email'), city=v('city'), file=f.elements.resume.files[0];
    if(name.length<2){ err.textContent='Please enter your name.'; f.elements.name.focus(); return; }
    if(mobile.replace(/\D/g,'').length<10){ err.textContent='Please enter a 10-digit mobile number.'; f.elements.mobile.focus(); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ err.textContent='Please enter your email address.'; f.elements.email.focus(); return; }
    if(city.length<2){ err.textContent='Please enter your city.'; f.elements.city.focus(); return; }
    if(file && file.size>5*1024*1024){ err.textContent='That file is larger than 5 MB. Please choose a smaller one.'; f.elements.resume.focus(); return; }
    err.textContent='';
    BNCForm.send(f,{ title:'Thank you, '+name+'.', text:'We have your application and will get in touch when a role fits.',
      mail:{ to:'info@bncmotors.in', subject:'Job application: '+name+' ('+v('area')+')', body:['Job application from the BNC website','','Name: '+name,'Mobile: '+mobile,'Email: '+email,'City: '+city,'Area: '+v('area'),'Experience: '+v('experience'),'Link: '+v('link'),'','About me:',v('about'),'','(Please attach your résumé to this email.)'].join('\n') } });
  });
})();
