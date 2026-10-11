(() => {
  const cfg=window.SUPABASE_CONFIG;
  const sb=window.supabase.createClient(cfg.url,cfg.publishableKey);
  window.sb=sb;
  let allAttendance=[]; let filtered=[];
  const $=id=>document.getElementById(id);
  const set=(id,v)=>{const e=$(id); if(e)e.textContent=v;};
  function todayVN(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function unitOf(r){return r.role==='Khách mời'?(r.unit||''):(r.lien_chi_doan||r.chi_doan||r.unit||'');}
  function applyFilters(){
    const name=($('filter-name')?.value||'').trim().toLowerCase();
    const role=$('filter-role')?.value||''; const group=$('filter-group')?.value||''; const child=$('filter-child')?.value||''; const guest=$('filter-guest-unit')?.value||'';
    filtered=allAttendance.filter(r=>{
      const okName=!name||(r.name||'').toLowerCase().includes(name);
      const okRole=!role||(r.role||'')===role;
      const okGroup=!group||(r.lien_chi_doan||'')===group;
      const okChild=!child||(r.chi_doan||'')===child;
      const okGuest=!guest||(r.unit||'')===guest;
      return okName&&okRole&&okGroup&&okChild&&okGuest;
    });
    renderStats(filtered); renderTable(filtered); set('filter-summary',`Đang hiển thị ${filtered.length}/${allAttendance.length} lượt điểm danh`);
  }
  function renderStats(rows){
    const guests=rows.filter(r=>r.role==='Khách mời').length;
    const delegates=rows.filter(r=>r.role==='Đại biểu tham dự').length;
    const today=rows.filter(r=>String(r.created_at||'').slice(0,10)===todayVN()).length;
    const units=new Set(rows.map(unitOf).filter(Boolean)).size;
    set('total',rows.length); set('guest-total',guests); set('delegate-total',delegates); set('today',today); set('units',units);
  }
  function renderTable(rows){
    const body=$('attendance-list'); if(!body)return;
    body.innerHTML=rows.map((r,i)=>`<tr class="border-b"><td class="p-3">${i+1}</td><td class="p-3 font-semibold">${esc(r.name)}</td><td class="p-3">${esc(r.role)}</td><td class="p-3">${esc(r.unit)}</td><td class="p-3">${esc(r.lien_chi_doan)}</td><td class="p-3">${esc(r.chi_doan)}</td><td class="p-3">${esc(r.phone)}</td><td class="p-3">${r.created_at?new Date(r.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):''}</td></tr>`).join('');
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  async function loadAttendance(){
    set('attendance-data-status','Đang tải dữ liệu điểm danh…');
    const {data,error}=await sb.from('attendance').select('id,name,role,unit,lien_chi_doan,chi_doan,phone,created_at').order('created_at',{ascending:false});
    if(error){console.error(error); set('attendance-data-status','⚠️ Không tải được dữ liệu: '+error.message); allAttendance=[]; filtered=[]; renderStats([]); renderTable([]); return;}
    allAttendance=data||[]; filtered=allAttendance; set('attendance-data-status',`Đã tải ${allAttendance.length} lượt điểm danh từ Supabase.`); populateFilters(); applyFilters();
  }
  function populateFilters(){
    const uniq=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
    fill('filter-group',uniq(allAttendance.map(r=>r.lien_chi_doan)), 'Tất cả Liên Chi đoàn');
    fill('filter-child',uniq(allAttendance.map(r=>r.chi_doan)), 'Tất cả Chi đoàn');
    fill('filter-guest-unit',uniq(allAttendance.filter(r=>r.role==='Khách mời').map(r=>r.unit)), 'Tất cả đơn vị khách mời');
  }
  function fill(id,vals,placeholder){const e=$(id);if(!e)return;const old=e.value;e.innerHTML=`<option value="">${placeholder}</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join('');e.value=vals.includes(old)?old:'';}
  async function login(e){e.preventDefault();set('login-msg','Đang đăng nhập…');const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){set('login-msg',error.message);return;}await showApp(data.user);}
  async function showApp(user){
    const {data:admin,error}=await sb.from('admin_users').select('user_id,display_name').eq('user_id',user.id).maybeSingle();
    if(error||!admin){await sb.auth.signOut();set('login-msg','Tài khoản đăng nhập chưa được cấp quyền quản trị.');return;}
    $('login').classList.add('hidden');$('app').classList.remove('hidden');set('admin-email',user.email||admin.display_name||'');
    await loadOptions(); await loadAttendance(); await loadFeedback();
  }
  async function restore(){const {data:{session}}=await sb.auth.getSession();if(session)await showApp(session.user);}
  async function loadOptions(){const {data,error}=await sb.from('attendance_options').select('*').eq('id',1).maybeSingle();if(error||!data)return;const guests=Array.isArray(data.guest_units)?data.guest_units:[]; $('guest-units').value=guests.join('\n'); const groups=Array.isArray(data.groups)?data.groups:[]; $('delegate-units').value=groups.map(g=>[g.name,...(g.children||[])].join('\n')).join('\n\n');}
  async function saveOptions(){const guests=($('guest-units').value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);const blocks=($('delegate-units').value||'').split(/\n\s*\n/).map(b=>b.split(/\n/).map(x=>x.trim()).filter(Boolean)).filter(Boolean);const groups=blocks.filter(b=>b.length).map(b=>({name:b[0],children:b.slice(1)}));const {error}=await sb.from('attendance_options').upsert({id:1,guest_units:guests,groups,updated_at:new Date().toISOString()});set('attendance-options-msg',error?'⚠️ '+error.message:'Đã lưu danh mục.');}

  let allFeedback=[];
  async function loadFeedback(){
    set('feedback-data-status','Đang tải phản hồi…');
    const {data,error}=await sb.from('conference_feedback').select('id,name,unit,rating,content,created_at').order('created_at',{ascending:false});
    if(error){console.error(error);set('feedback-data-status','Không tải được phản hồi: '+error.message+' (hãy chạy file SQL migration đi kèm).');allFeedback=[];renderFeedback();return;}
    allFeedback=data||[];renderFeedback();set('feedback-data-status',`Đã tải ${allFeedback.length} phản hồi từ Supabase.`);
  }
  function renderFeedback(){
    const total=allFeedback.length;const avg=total?(allFeedback.reduce((a,r)=>a+Number(r.rating||0),0)/total).toFixed(2):'—';const positive=allFeedback.filter(r=>Number(r.rating)>=4).length;
    set('feedback-total',total);set('feedback-average',avg);set('feedback-positive',positive);
    const body=$('feedback-list');if(!body)return;
    body.innerHTML=total?allFeedback.map((r,i)=>`<tr class="border-b align-top"><td class="p-3">${i+1}</td><td class="p-3 font-semibold">${esc(r.name)}</td><td class="p-3">${esc(r.unit)}</td><td class="p-3">${'★'.repeat(Math.max(0,Math.min(5,Number(r.rating)||0)))} (${esc(r.rating)}/5)</td><td class="p-3 whitespace-pre-wrap min-w-64">${esc(r.content)}</td><td class="p-3 whitespace-nowrap">${r.created_at?new Date(r.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):''}</td></tr>`).join(''):'<tr><td colspan="6" class="p-3 text-slate-500">Chưa có phản hồi nào.</td></tr>';
  }
  function exportFeedback(){const head=['STT','Họ tên','Đơn vị','Đánh giá','Nội dung','Thời gian'];const csv='\ufeff'+[head,...allFeedback.map((r,i)=>[i+1,r.name,r.unit,r.rating,r.content,r.created_at])].map(a=>a.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gop-y-danh-gia-hoi-nghi.csv';a.click();URL.revokeObjectURL(a.href);}

  function wire(){
    $('login-form')?.addEventListener('submit',login); $('logout')?.addEventListener('click',async()=>{await sb.auth.signOut();location.reload();});
    $('refresh')?.addEventListener('click',loadAttendance); $('feedback-refresh')?.addEventListener('click',loadFeedback); $('feedback-export')?.addEventListener('click',exportFeedback); $('clear-filters')?.addEventListener('click',()=>{['filter-name','filter-role','filter-group','filter-child','filter-guest-unit'].forEach(id=>{if($(id))$(id).value='';});applyFilters();});
    ['filter-name','filter-role','filter-group','filter-child','filter-guest-unit'].forEach(id=>$(id)?.addEventListener(id==='filter-name'?'input':'change',applyFilters)); $('save-attendance-options')?.addEventListener('click',saveOptions);
    $('export')?.addEventListener('click',()=>{const rows=filtered;const head=['STT','Họ tên','Vai trò','Đơn vị','Liên Chi đoàn','Chi đoàn','Số điện thoại','Thời gian'];const csv='\ufeff'+[head,...rows.map((r,i)=>[i+1,r.name,r.role,r.unit,r.lien_chi_doan,r.chi_doan,r.phone,r.created_at])].map(a=>a.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='diem-danh.csv';a.click();URL.revokeObjectURL(a.href);});
  }
  document.addEventListener('DOMContentLoaded',()=>{wire();restore();});
})();
