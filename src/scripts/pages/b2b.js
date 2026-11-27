/* the fleet form: check the four fields, send the answers from the page, say thank you in its place */
(function(){
  var f=document.getElementById('fleet-form'); if(!f) return; var err=document.getElementById('fleet-err');
  f.addEventListener('submit',function(e){ e.preventDefault(); var d=new FormData(f);
    var v=function(k){ return String(d.get(k)||'').trim(); };
    var name=v('name'), company=v('company'), mobile=v('mobile').replace(/[^0-9+]/g,''), city=v('city');
    if(name.length<2){ err.textContent='Please enter your name.'; f.elements.name.focus(); return; }
    if(company.length<2){ err.textContent='Please enter your company.'; f.elements.company.focus(); return; }
    if(mobile.replace(/\D/g,'').length<10){ err.textContent='Please enter a 10-digit mobile number.'; f.elements.mobile.focus(); return; }
    if(city.length<2){ err.textContent='Please enter your city.'; f.elements.city.focus(); return; }
    err.textContent='';
    BNCForm.send(f,{ title:'Thank you, '+name+'.', text:'We have your enquiry and will come back to you with the bike and the numbers.',
      mail:{ to:'info@bncmotors.in', subject:'Fleet enquiry: '+company, body:['Fleet enquiry from the BNC website','','Name: '+name,'Company: '+company,'Mobile: '+mobile,'City: '+city,'Need: '+v('need'),'Bikes needed: '+v('size'),'Bike: '+v('model'),'What our riders carry and how far they go each day: '+v('work')].join('\n') } });
  });
})();
