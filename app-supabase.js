(() => {
 const sb=window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.publishableKey); window.sb=sb;
 const $=id=>document.getElementById(id); const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 let options={guest_units:[],groups:[]};
 async function loadOptions(){const {data}=await sb.from('attendance_options').select('*').eq('id',1).maybeSingle();if(data){options=data;fillGuest();fillGroups();}}
 function fillGuest(){const e=$('att-guest-unit');if(!e)return;e.innerHTML='<option value="">-- Chọn đơn vị --</option>'+(options.guest_units||[]).map(x=>`<option>${esc(x)}</option>`).join('');}
 function fillGroups(){const e=$('att-lien-chi-doan');if(!e)return;e.innerHTML='<option value="">-- Chọn Liên Chi đoàn --</option>'+(options.groups||[]).map(g=>`<option>${esc(g.name)}</option>`).join('');fillChildren();}
 function fillChildren(){const parent=$('att-lien-chi-doan')?.value;const g=(options.groups||[]).find(x=>x.name===parent);const e=$('att-chi-doan');if(!e)return;e.innerHTML='<option value="">-- Chọn Chi đoàn --</option>'+((g?.children)||[]).map(x=>`<option>${esc(x)}</option>`).join('');}
 async function submit(e){e.preventDefault();const name=$('att-name')?.value.trim().replace(/\s+/g,' ');const role=$('att-role')?.value;const phone=$('att-phone')?.value.trim()||null;const msg=$('attendance-message');const unit=role==='Khách mời'?$('att-guest-unit')?.value||null:null;const lien=role==='Đại biểu tham dự'?$('att-lien-chi-doan')?.value||null:null;const chi=role==='Đại biểu tham dự'?$('att-chi-doan')?.value||null:null;if(!name||!role){msg.textContent='Vui lòng nhập đủ họ tên và vai trò.';return;} if(role==='Khách mời'&&!unit){msg.textContent='Vui lòng chọn đơn vị.';return;} if(role==='Đại biểu tham dự'&&(!lien||!chi)){msg.textContent='Vui lòng chọn Liên Chi đoàn và Chi đoàn.';return;}
 const {data:dupe}=await sb.from('attendance').select('id').eq('name',name).eq('role',role).eq('unit',unit).eq('lien_chi_doan',lien).eq('chi_doan',chi).limit(1); if(dupe&&dupe.length){msg.textContent='Bạn đã điểm danh trước đó. Vui lòng không gửi lại.';return;}
 const {error}=await sb.from('attendance').insert({name,role,unit,lien_chi_doan:lien,chi_doan:chi,phone}); if(error){msg.textContent=error.code==='23505'?'Bạn đã điểm danh trước đó. Vui lòng không gửi lại.':('Không thể ghi nhận: '+error.message);return;} msg.textContent='Điểm danh thành công!'; e.target.reset(); fillChildren(); loadCount(); }
 async function loadCount(){const e=$('attendance-count');if(!e)return;const {count}=await sb.from('attendance').select('*',{count:'exact',head:true});if(count!=null)e.textContent=count;}
 function updateRoleFields(){
  const role=$('att-role')?.value||'';
  const guest=$('guest-fields'); const delegate=$('delegate-fields');
  if(guest) guest.classList.toggle('hidden',role!=='Khách mời');
  if(delegate) delegate.classList.toggle('hidden',role!=='Đại biểu tham dự');
  // Clear the fields for the role that is not selected so stale values are not submitted.
  if(role!=='Khách mời' && $('att-guest-unit')) $('att-guest-unit').value='';
  if(role!=='Đại biểu tham dự'){
   if($('att-lien-chi-doan')) $('att-lien-chi-doan').value='';
   if($('att-chi-doan')) $('att-chi-doan').value='';
  } else { fillChildren(); }
 }
 document.addEventListener('DOMContentLoaded',()=>{
  loadOptions(); loadCount();
  $('att-role')?.addEventListener('change',updateRoleFields);
  $('att-lien-chi-doan')?.addEventListener('change',fillChildren);
  $('attendance-form')?.addEventListener('submit',submit);
  updateRoleFields();
 });
})();
