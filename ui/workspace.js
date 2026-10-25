let reportPage=0;
function renderReports(){
 const error=$('#report-error'),calendar=$('#report-calendar');error.textContent='';
 try{
  const report=availabilityReport(data,$('#report-start').value,$('#report-end').value,$('#report-mode').value,$('#report-match').value);
  const total=report.rows.length,pageSize=30,pages=Math.max(1,Math.ceil(total/pageSize));
  reportPage=Math.max(0,Math.min(reportPage,pages-1));
  $('#report-summary').textContent='Okres: '+report.start+' – '+report.end+' · Znaleziono osób: '+total+' / '+data.people.length;
  $('#report-page').textContent='Strona '+(reportPage+1)+' / '+pages;
  $('#report-prev').disabled=reportPage===0;$('#report-next').disabled=reportPage>=pages-1;
  const dates=Array.from({length:report.days},(_,i)=>plus(report.start,i));
  const head='<thead><tr><th scope="col" class="report-person">Osoba / dostępność</th>'+dates.map(d=>'<th scope="col" title="'+d+'" class="'+([0,6].includes(dt(d).getUTCDay())?'report-weekend':'')+'">'+d.slice(8)+'.'+d.slice(5,7)+'</th>').join('')+'</tr></thead>';
  const body=report.rows.slice(reportPage*pageSize,(reportPage+1)*pageSize).map(r=>'<tr><th scope="row" class="report-person"><strong>'+esc(r.person.name)+'</strong><small>'+esc([r.person.role,r.person.group].filter(Boolean).join(' · '))+'</small><small>Pasujące dni: '+r.count+' / '+report.days+'</small></th>'+r.loads.map((load,i)=>'<td class="'+(load===0?'availability-free':load<100?'availability-partial':load>100?'availability-over':'availability-full')+(r.qualifies[i]?' availability-match':'')+'" title="'+esc(r.person.name)+' · '+dates[i]+' · Zajętość: '+load+'% · Wolne: '+Math.max(0,100-load)+'%">'+load+'%</td>').join('')+'</tr>').join('');
  calendar.innerHTML=total?'<table class="report-table"><caption class="sr-only">Dzienny kalendarz obciążenia osób w wybranym okresie</caption>'+head+'<tbody>'+body+'</tbody></table>':'<div class="empty">Brak osób spełniających wybrane warunki.</div>';
 }catch(e){error.textContent=e.message;calendar.innerHTML='';$('#report-summary').textContent='';$('#report-page').textContent='';$('#report-prev').disabled=$('#report-next').disabled=true}
}
$('#report-start').value=today;$('#report-end').value=plus(today,30);
$('#report-form').onsubmit=e=>{e.preventDefault();reportPage=0;renderReports()};
for(const id of ['#report-start','#report-end','#report-mode','#report-match'])$(id).onchange=()=>{reportPage=0;renderReports()};
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
