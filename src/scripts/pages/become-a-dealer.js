/* the dealer enquiry: check what is asked for, send the answers from the page, say thank you in its place */
(function(){
  var f=document.getElementById('dealer-form'); if(!f) return; var err=document.getElementById('dealer-err');
  f.addEventListener('submit',function(e){ e.preventDefault(); var d=new FormData(f);
    var v=function(k){ return String(d.get(k)||'').trim(); };
    var need=[['name','your name'],['state','your state'],['city','your city'],['area','your area'],['pincode','your pincode'],['location_1','the first location you are interested in'],['pincode_1','the pincode of that location'],['investment_lakhs','your investment capability'],['source','how you know about us'],['experience','your dealership experience']];
    var mobile=v('mobile').replace(/[^0-9+]/g,''), email=v('email');
    if(v('name').length<2){ err.textContent='Please enter your name.'; f.elements.name.focus(); return; }
    if(mobile.replace(/\D/g,'').length<10){ err.textContent='Please enter a 10-digit mobile number.'; f.elements.mobile.focus(); return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ err.textContent='Please enter your email address.'; f.elements.email.focus(); return; }
    for(var i=0;i<need.length;i++){ if(!v(need[i][0])){ err.textContent='Please enter '+need[i][1]+'.'; f.elements[need[i][0]].focus(); return; } }
    err.textContent='';
    var lines=['Dealership enquiry from the BNC website','']; d.forEach(function(val,k){ if(k!=='form-name' && k!=='bot-field' && String(val).trim()) lines.push(k.replace(/_/g,' ')+': '+val); });
    BNCForm.send(f,{ title:'Thank you, '+v('name')+'.', text:'We have your dealership enquiry and will get in touch.',
      mail:{ to:'info@bncmotors.in', subject:'Dealership enquiry: '+v('name')+' ('+v('city')+')', body:lines.join('\n') } });
  });
})();
