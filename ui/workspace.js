let reportPage=0;
function renderReports(){
 const error=$('#report-error'),calendar=$('#report-calendar');error.textContent='';
 try{
  const report=availabilityReport(data,$('#report-start').value,$('#report-end').value,$('#report-mode').value,$('#report-match').value);
  const total=report.rows.length,pageSize=60,pages=Math.max(1,Math.ceil(total/pageSize));
  reportPage=Math.max(0,Math.min(reportPage,pages-1));
  $('#report-summary').textContent='Okres: '+report.start+' – '+report.end+' · Znaleziono osób: '+total+' / '+data.people.length;
  $('#report-page').textContent='Strona '+(reportPage+1)+' / '+pages;
  $('#report-prev').disabled=reportPage===0;$('#report-next').disabled=reportPage>=pages-1;
  const dates=Array.from({length:report.days},(_,i)=>plus(report.start,i));
  const head='<thead><tr><th scope="col" class="report-person">Osoba / dostępność</th>'+dates.map(d=>'<th scope="col" title="'+d+'" class="'+([0,6].includes(dt(d).getUTCDay())?'report-weekend':'')+'">'+d.slice(8)+'.'+d.slice(5,7)+'</th>').join('')+'</tr></thead>';
  const body=report.rows.slice(reportPage*pageSize,(reportPage+1)*pageSize).map(r=>'<tr><th scope="row" class="report-person" title="'+esc([r.person.name,r.person.role,r.person.group,'Pasujące dni: '+r.count+' / '+report.days].filter(Boolean).join(' · '))+'"><span class="report-person-name">'+esc(r.person.name)+'</span><span class="report-day-count">'+r.count+'/'+report.days+'</span></th>'+r.loads.map((load,i)=>'<td class="'+(load===0?'availability-free':load<100?'availability-partial':load>100?'availability-over':'availability-full')+(r.qualifies[i]?' availability-match':'')+'" title="'+esc(r.person.name)+' · '+dates[i]+' · Zajętość: '+load+'% · Wolne: '+Math.max(0,100-load)+'%">'+load+'%</td>').join('')+'</tr>').join('');
  calendar.innerHTML=total?'<table class="report-table"><caption class="sr-only">Dzienny kalendarz obciążenia osób w wybranym okresie</caption>'+head+'<tbody>'+body+'</tbody></table>':'<div class="empty">Brak osób spełniających wybrane warunki.</div>';
 }catch(e){error.textContent=e.message;calendar.innerHTML='';$('#report-summary').textContent='';$('#report-page').textContent='';$('#report-prev').disabled=$('#report-next').disabled=true}
}
$('#report-start').value=today;$('#report-end').value=plus(today,30);
$('#report-form').onsubmit=e=>{e.preventDefault();reportPage=0;renderReports()};
for(const id of ['#report-start','#report-end','#report-mode','#report-match'])$(id).onchange=()=>{rangeAnchor=null;paintRange();reportPage=0;renderReports()};
$('#report-prev').onclick=()=>{reportPage--;renderReports()};
$('#report-next').onclick=()=>{reportPage++;renderReports()};
function applyTheme(theme){const next=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=next;$('#theme').value=next}
$('#theme').onchange=async()=>{
 const theme=$('#theme').value;applyTheme(theme);$('#theme').disabled=true;
 try{const api=await desktopApi();await api.set_theme(theme)}
 catch(e){toast('Motyw zmieniony, ale nie zapamiętano ustawienia: '+e.message)}
 finally{$('#theme').disabled=false}
};
let startupStarted=false;
async function restoreWorkspace(){
 if(startupStarted)return;startupStarted=true;
 const main=$('main'),aside=$('aside');main.inert=true;aside.inert=true;fileBusy=true;
 fileNotice='Wczytywanie ostatniego pliku…';updateFileStatus();
 try{
  const api=await desktopApi(),preferences=await api.get_preferences();applyTheme(preferences.theme);
  if(isDirty()){fileNotice='';return}
  const file=await api.restore_last_plan();
  if(file?.error){fileNotice=file.error;return}
  if(file){
   const next=JSON.parse(file.text);if(!valid(next))throw Error('Nieprawidłowy ostatnio używany plik. Otwórz inny plik.');
   await api.accept_open(file.token);
   data=next;fileName=file.name;filePath=file.path||file.name;
   $('#disk-format').value=file.format||'xlsx';savedSnapshot=JSON.stringify(data);
  }
  fileNotice='';render();
 }catch(e){fileNotice='Nie wczytano ostatniego pliku: '+e.message}
 finally{fileBusy=false;main.inert=false;aside.inert=false;updateFileStatus()}
}
window.addEventListener('pywebviewready',restoreWorkspace);
if(window.pywebview?.api)restoreWorkspace();

// Range selection remains independent of filtered report rows (including empty results).
let rangeMonth=today.slice(0,7)+'-01',rangeAnchor=null,rangeDrag=null;
function rangeBounds(a,b){return a<=b?[a,b]:[b,a]}
function paintRange(preview){
 const [first,last]=preview||[$('#report-start').value,$('#report-end').value];
 document.querySelectorAll('[data-range-date]').forEach(button=>{
  const day=button.dataset.rangeDate,selected=day>=first&&day<=last;
  button.classList.toggle('range-selected',selected);button.classList.toggle('range-edge',day===first||day===last);
  button.setAttribute('aria-pressed',String(selected));
 });
 $('#range-selection').textContent=rangeAnchor?'Początek: '+rangeAnchor+' — wybierz koniec':first+' – '+last;
}
function renderRangeCalendar(){
 const base=dt(rangeMonth),months=[0,1].map(offset=>new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+offset,1)));
 $('#range-months').textContent=months.map(d=>d.toLocaleDateString('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'})).join(' / ');
 $('#range-calendar').innerHTML=months.map(month=>{
  const first=month.toISOString().slice(0,10),skip=(month.getUTCDay()+6)%7,last=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
  return '<div class="range-month"><strong>'+month.toLocaleDateString('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'})+'</strong><div class="range-days">'+['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(x=>'<span>'+x+'</span>').join('')+'<span class="range-spacer" style="grid-column:span '+(skip||1)+'" '+(!skip?'hidden':'')+'></span>'+Array.from({length:last},(_,i)=>{const date=plus(first,i);return '<button type="button" data-range-date="'+date+'" aria-label="'+date+'">'+(i+1)+'</button>'}).join('')+'</div></div>';
 }).join('');paintRange();
}
function commitRange(a,b){
 const [first,last]=rangeBounds(a,b);
 if((dt(last)-dt(first))/86400000>=366){$('#report-error').textContent='Wybierz okres nie dłuższy niż 366 dni.';rangeAnchor=null;paintRange();return}
 $('#report-start').value=first;$('#report-end').value=last;rangeAnchor=null;paintRange();reportPage=0;renderReports();
}
for(const [id,step] of [['#range-prev',-1],['#range-next',1]])$(id).onclick=()=>{
 const date=dt(rangeMonth);rangeMonth=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+step,1)).toISOString().slice(0,10);renderRangeCalendar();
};
const rangeCalendar=$('#range-calendar');
rangeCalendar.addEventListener('pointerdown',e=>{
 const button=e.target.closest('[data-range-date]');if(!button||e.button!==0)return;
 rangeDrag={start:button.dataset.rangeDate,end:button.dataset.rangeDate,id:e.pointerId};
});
window.addEventListener('pointermove',e=>{
 if(!rangeDrag||e.pointerId!==rangeDrag.id)return;
 const button=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-range-date]');
 if(button){rangeDrag.end=button.dataset.rangeDate;paintRange(rangeBounds(rangeDrag.start,rangeDrag.end))}
});
let suppressRangeClick=false;
window.addEventListener('pointerup',e=>{
 if(!rangeDrag||e.pointerId!==rangeDrag.id)return;
 const drag=rangeDrag;rangeDrag=null;
 if(drag.start!==drag.end){suppressRangeClick=true;commitRange(drag.start,drag.end);setTimeout(()=>{suppressRangeClick=false},0)}else paintRange();
});
window.addEventListener('pointercancel',()=>{rangeDrag=null;paintRange()});
window.addEventListener('blur',()=>{rangeDrag=null;paintRange()});
rangeCalendar.addEventListener('click',e=>{
 const button=e.target.closest('[data-range-date]');if(!button||suppressRangeClick)return;
 const date=button.dataset.rangeDate;
 if(rangeAnchor)commitRange(rangeAnchor,date);else{rangeAnchor=date;paintRange([date,date])}
});
renderRangeCalendar();
