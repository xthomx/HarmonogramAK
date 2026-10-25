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
const initialReportBounds=bounds(dt(today),'month');
$('#report-start').value=initialReportBounds[0];$('#report-end').value=initialReportBounds[1];
$('#report-form').onsubmit=e=>{e.preventDefault();reportPage=0;renderReports()};
for(const id of ['#report-start','#report-end','#report-mode','#report-match'])$(id).onchange=()=>{renderRangeCalendar();reportPage=0;renderReports()};
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

// Report timeline uses the schedule's date bounds, week columns and CSS.
let rangeCursor=dt(today),rangeDrag=null,rangeWheelSum=0,rangeZoomAt=0;
const rangeChart=$('#range-chart');
function rangeBounds(){return bounds(rangeCursor,$('#range-scale').value)}
function rangeColumns(){const [start,end]=rangeBounds(),days=Array.from({length:(dt(end)-dt(start))/DAY+1},(_,i)=>plus(start,i));return $('#range-unit').value==='weeks'?weekColumns(days):days.map(day=>({start:day,end:day,count:1}))}
function renderRangeCalendar(){
 const [start,end]=rangeBounds(),days=(dt(end)-dt(start))/DAY+1,columns=rangeColumns(),weekly=$('#range-unit').value==='weeks',months=[];
 const monthTitle=d=>dt(d).toLocaleDateString('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'});
 $('#range-period').textContent=$('#range-scale').value==='week'?start+' – '+end:monthTitle(start)+(start.slice(0,7)!==end.slice(0,7)?' – '+monthTitle(end):'');
 for(let i=0;i<days;i++){const day=plus(start,i);if(months.at(-1)?.key===day.slice(0,7))months.at(-1).count++;else months.push({key:day.slice(0,7),day,count:1})}
 rangeChart.classList.toggle('weekly-view',weekly);rangeChart.classList.toggle('long-view',weekly&&monthCount($('#range-scale').value)>=6);
 const weekend=d=>[0,6].includes(dt(d).getUTCDay());
 rangeChart.innerHTML=(months.length>1?'<div class="row month-head"><div class="label">MIESIĄCE</div><div class="month-segments">'+months.map(m=>'<div style="flex:'+m.count+'">'+esc(monthTitle(m.day))+'</div>').join('')+'</div></div>':'')+'<div class="row head"><div class="label">OKRES RAPORTU</div><div class="days">'+columns.map(c=>weekly?'<div class="week-column" style="flex:'+c.count+'" title="Tydzień '+c.number+': '+c.start+' – '+c.end+'"><strong>'+c.number+'</strong></div>':'<div class="day '+(weekend(c.start)?'weekend ':'')+(c.start===today?'today':'')+'">'+['N','P','W','Ś','C','P','S'][dt(c.start).getUTCDay()]+'<b>'+Number(c.start.slice(8))+'</b></div>').join('')+'</div></div><div class="row"><div class="label">Zaznaczony zakres</div><div class="track" id="range-track"><div class="grid-bg">'+columns.map(c=>'<div class="cell '+(weekly?'week-cell':weekend(c.start)?'weekend':'')+'" style="flex:'+c.count+'"></div>').join('')+'</div><button type="button" id="range-bar" class="bar" aria-label="Wybrany okres raportu"><span class="resize-handle start" data-range-resize="start"></span><span class="bar-text"></span><span class="resize-handle end" data-range-resize="end"></span></button></div></div>';
 paintRange();
}
function paintRange(first=$('#report-start').value,last=$('#report-end').value){
 const [start,end]=rangeBounds(),days=(dt(end)-dt(start))/DAY+1,bar=$('#range-bar');
 bar.hidden=!first||!last||last<first||last<start||first>end;
 const left=Math.max(0,(dt(first)-dt(start))/DAY),right=Math.min(days,(dt(last)-dt(start))/DAY+1);
 bar.style.left=(left/days*100)+'%';bar.style.width=((right-left)/days*100)+'%';
 bar.querySelector('.bar-text').textContent=first+' – '+last;bar.title=first+' – '+last;
 bar.querySelector('[data-range-resize="start"]').hidden=first<start;
 bar.querySelector('[data-range-resize="end"]').hidden=last>end;
 $('#range-selection').textContent='Wybrany zakres: '+first+' – '+last;
}
function rangeColumnAt(x){const rect=$('#range-track').getBoundingClientRect(),[start,end]=rangeBounds(),days=(dt(end)-dt(start))/DAY+1,day=plus(start,Math.max(0,Math.min(days-1,Math.floor((x-rect.left)/rect.width*days))));return rangeColumns().find(c=>day>=c.start&&day<=c.end)}
function selectVisibleReportRange(){
 rangeDrag=null;const [first,last]=rangeBounds();
 $('#report-start').value=first;$('#report-end').value=last;
 reportPage=0;renderRangeCalendar();renderReports();
}
function commitRange(first,last){
 if(!first||!last||last<first||(dt(last)-dt(first))/DAY>=366){$('#report-error').textContent='Wybierz poprawny okres nie dłuższy niż 366 dni.';paintRange();return}
 $('#report-start').value=first;$('#report-end').value=last;paintRange();reportPage=0;renderReports();
}
for(const [id,step] of [['#range-prev',-1],['#range-next',1]])$(id).onclick=()=>{
 rangeDrag=null;const scale=$('#range-scale').value;
 rangeCursor=scale==='week'?new Date(+rangeCursor+step*7*DAY):new Date(Date.UTC(rangeCursor.getUTCFullYear(),rangeCursor.getUTCMonth()+step*monthCount(scale),1));selectVisibleReportRange();
};
$('#range-today').onclick=()=>{rangeCursor=dt(today);selectVisibleReportRange()};
$('#range-scale').onchange=()=>{if(monthCount($('#range-scale').value)>=6)$('#range-unit').value='weeks';selectVisibleReportRange()};
$('#range-unit').onchange=renderRangeCalendar;
rangeChart.addEventListener('pointerdown',e=>{
 if(e.button!==0||!e.target.closest('#range-track'))return;
 e.preventDefault();const column=rangeColumnAt(e.clientX),bar=e.target.closest('#range-bar');
 rangeDrag={id:e.pointerId,column,mode:e.target.dataset.rangeResize||(bar?'move':'new'),start:$('#report-start').value,end:$('#report-end').value};
 rangeChart.setPointerCapture(e.pointerId);updateRangeDrag(e.clientX);
});
function updateRangeDrag(x){
 const d=rangeDrag,c=rangeColumnAt(x);let first=d.start,last=d.end;
 if(d.mode==='new'){first=c.start<d.column.start?c.start:d.column.start;last=c.end>d.column.end?c.end:d.column.end}
 else if(d.mode==='start')first=c.start>last?last:c.start;
 else if(d.mode==='end')last=c.end<first?first:c.end;
 else{const offset=(dt(c.start)-dt(d.column.start))/DAY;first=plus(d.start,offset);last=plus(d.end,offset)}
 d.first=first;d.last=last;
 if((dt(last)-dt(first))/DAY<366){$('#report-start').value=first;$('#report-end').value=last;reportPage=0;renderReports()}
 paintRange(first,last);
}
let rangeFrame=null,rangePendingX=0;
rangeChart.addEventListener('pointermove',e=>{
 if(rangeDrag?.id!==e.pointerId)return;rangePendingX=e.clientX;
 if(rangeFrame===null)rangeFrame=requestAnimationFrame(()=>{rangeFrame=null;if(rangeDrag)updateRangeDrag(rangePendingX)});
});
rangeChart.addEventListener('pointerup',e=>{if(rangeDrag?.id!==e.pointerId)return;if(rangeFrame!==null){cancelAnimationFrame(rangeFrame);rangeFrame=null}updateRangeDrag(e.clientX);const d=rangeDrag;rangeDrag=null;rangeChart.releasePointerCapture(e.pointerId);commitRange(d.first,d.last)});
function cancelRangeDrag(){if(rangeFrame!==null){cancelAnimationFrame(rangeFrame);rangeFrame=null}const previous=rangeDrag;rangeDrag=null;if(previous){$('#report-start').value=previous.start;$('#report-end').value=previous.end;renderReports()}paintRange()}
rangeChart.addEventListener('pointercancel',cancelRangeDrag);
rangeChart.addEventListener('lostpointercapture',()=>{if(rangeDrag)cancelRangeDrag()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&rangeDrag)cancelRangeDrag()});
rangeChart.addEventListener('wheel',e=>{
 if(!e.ctrlKey){rangeWheelSum=0;return}
 if(e.shiftKey||rangeDrag||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
 e.preventDefault();const now=Date.now();if(now-rangeZoomAt<200)return;
 rangeWheelSum+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?200:1);if(Math.abs(rangeWheelSum)<40)return;
 const current=$('#range-scale').value,next=zoomScale(current,rangeWheelSum>0?1:-1);rangeWheelSum=0;if(current===next)return;
 rangeCursor=dt(rangeColumnAt(e.clientX).start);$('#range-scale').value=next;$('#range-unit').value=monthCount(next)>=6?'weeks':'days';rangeZoomAt=now;selectVisibleReportRange();
},{passive:false});
renderRangeCalendar();
