let carsCursor=dt(today),carsTab='calendar',carEdit=null,carEditKind='cars',carDrag=null;
const carExtraFields=['ownerId','driver','odometer','vignetteRO','vignetteSK','vignetteHU','vignetteCZ','vignetteAT','de','inspection','tires','kp','notes'];
const carColumns=[['Nr rej.','plate'],['Marka i model','name'],['Kierowca','driver'],['Stan licznika','odometer'],['Winieta RO','vignetteRO'],['Winieta SK','vignetteSK'],['Winieta HU','vignetteHU'],['Winieta CZ','vignetteCZ'],['Winieta AT','vignetteAT'],['DE','de'],['PRZEGLĄD','inspection'],['OPONY','tires'],['KP O2 12.10.2026','kp'],['Uwagi','notes'],['Miejsca','seats'],['Użytkowanie','usage'],['Użytkownik / sekcja','owner']];
function carColumnValue(car,key){if(key==='owner'&&car.ownerId)return data.people.find(p=>p.id===car.ownerId)?.name||'—';if(key.startsWith('vignette'))return car[key]||'Brak';if(key==='odometer')return car.odometer===undefined?'':car.odometer.toLocaleString('pl-PL')+' km';return car[key]??''}
const carsList=()=>data.cars||[],carBookings=()=>data.carReservations||[];
const carsBounds=()=>bounds(carsCursor,$('#cars-scale').value);
function fleetChange(key,items){const next=normalizeBookingDrivers({...data,[key]:items});validateFleet(next);data=next;save()}
function carTooltip(car){return carColumns.map(([label,key])=>label+': '+(carColumnValue(car,key)||'—')).join('\n')}
function carCaption(car){return car.plate+' · '+car.name}
function renderCars(){
 $('#stats').innerHTML=[['Samochody',carsList().length],['Rezerwacje',carBookings().length],['Łącznie miejsc',carsList().reduce((n,c)=>n+c.seats,0)]].map(([name,count])=>'<div class="stat"><small>'+name+'</small><strong>'+count+'</strong></div>').join('');
 const calendar=carsTab==='calendar';$('#cars-calendar').hidden=!calendar;$('#cars-list').hidden=calendar;
 $('#cars-calendar-tab').classList.toggle('active',calendar);$('#cars-list-tab').classList.toggle('active',!calendar);
 $('#add').textContent=calendar?'＋ Nowa rezerwacja':'＋ Dodaj samochód';
 const select=$('#cars-project-filter'),chosen=select.value;
 select.innerHTML='<option value="">Wszystkie projekty</option>'+data.projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(projectIdentity(p))+'</option>').join('');select.value=chosen;
 if(!calendar){
  $('#cars-list').innerHTML='<div class="catalog-table"><div class="catalog-heading car-columns">'+carColumns.map(([label])=>'<span>'+label+'</span>').join('')+'<span></span></div>'+carsList().map(c=>'<div class="catalog-row car-columns">'+carColumns.map(([,key])=>catalogCell(carColumnValue(c,key),key==='name'?'catalog-name':'')).join('')+'<button data-car-edit="'+esc(c.id)+'">Edytuj</button></div>').join('')+'</div>'+(carsList().length?'':'<div class="empty">Dodaj pierwszy samochód, aby rozpocząć rezerwacje.</div>');
  $('#cars-list').querySelectorAll('[data-car-edit]').forEach(b=>b.onclick=()=>openCar(b.dataset.carEdit));return;
 }
 const [start,end]=carsBounds(),days=Array.from({length:(dt(end)-dt(start))/DAY+1},(_,i)=>plus(start,i)),weekly=$('#cars-unit').value==='weeks',weeks=weekColumns(days),q=$('#cars-search').value.trim().toLocaleLowerCase('pl'),project=select.value,usage=$('#cars-usage-filter').value;
 const monthTitle=d=>dt(d).toLocaleDateString('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'});
 $('#cars-period').textContent=$('#cars-scale').value==='week'?start+' – '+end:monthTitle(start)+(start.slice(0,7)!==end.slice(0,7)?' – '+monthTitle(end):'');
 const chart=$('#cars-chart');chart.classList.toggle('weekly-view',weekly);chart.classList.toggle('long-view',weekly&&monthCount($('#cars-scale').value)>=6);
 const months=[];for(const day of days){if(months.at(-1)?.key===day.slice(0,7))months.at(-1).count++;else months.push({key:day.slice(0,7),date:day,count:1})}
 const weekend=d=>[0,6].includes(dt(d).getUTCDay());
 let html=(months.length>1?'<div class="row month-head"><div class="label">MIESIĄCE</div><div class="month-segments">'+months.map(m=>'<div style="flex:'+m.count+'" title="'+esc(monthTitle(m.date))+'">'+esc(weekly?dt(m.date).toLocaleDateString('pl-PL',{month:'short',timeZone:'UTC'}):monthTitle(m.date))+'</div>').join('')+'</div></div>':'')+'<div class="row head"><div class="label">NR REJESTRACYJNY</div><div class="days" title="Przeciągnij w lewo lub w prawo, aby przesunąć daty. Esc — anuluj.">'+(weekly?weeks.map(w=>'<div class="week-column '+(today>=w.start&&today<=w.end?'current-week':'')+'" style="flex:'+w.count+'" title="Tydzień '+w.number+': '+w.start+' – '+w.end+'"><strong>'+w.number+'</strong></div>'):days.map(d=>'<div class="day '+(weekend(d)?'weekend ':'')+(d===today?'today':'')+'">'+['N','P','W','Ś','C','P','S'][dt(d).getUTCDay()]+'<b>'+Number(d.slice(8))+'</b></div>')).join('')+'</div></div>';
 let count=0,booked=0;
 for(const car of carsList()){
  if(usage&&car.usage!==usage)continue;
  let own=carBookings().filter(b=>b.car===car.id&&b.start<=end&&b.end>=start&&(!project||b.project===project));
  const matches=[car.id,car.name,car.plate,carColumnValue(car,'owner'),car.driver].join(' ').toLocaleLowerCase('pl').includes(q);
  if(q&&!matches)own=own.filter(b=>projectText(data.projects.find(p=>p.id===b.project)).toLocaleLowerCase('pl').includes(q));
  if((project||q&&!matches)&&!own.length)continue;count++;booked+=own.length;
  const grid='<div class="grid-bg">'+(weekly?weeks.map(w=>'<div class="cell week-cell" style="flex:'+w.count+'"></div>'):days.map(d=>'<div class="cell '+(weekend(d)?'weekend':'')+'"></div>')).join('')+'</div>';

  const bars=own.map(b=>{
   const project=data.projects.find(p=>p.id===b.project),span=reportSpan(b.start,b.end,start,end);
   const visibleStart=b.start>start?b.start:start,visibleEnd=b.end<end?b.end:end;
   const warnings=vignetteWarningSegments(car,visibleStart,visibleEnd);
   const warningTitle=warnings.map(w=>'⚠ Winieta '+w.countries.join(', ')+' nieważna: '+w.start+' – '+w.end).join('\n');
   const overlays=warnings.map(w=>{const part=reportSpan(w.start,w.end,visibleStart,visibleEnd);return '<span class="vignette-warning" style="left:'+part.left+'%;width:'+part.width+'%" title="'+esc('⚠ Nieważna winieta: '+w.countries.join(', ')+' · '+w.start+' – '+w.end)+'">⚠ '+w.countries.join(', ')+'</span>'}).join('');
   return '<button class="bar" data-booking="'+esc(b.id)+'" style="left:'+span.left+'%;width:'+span.width+'%;top:4px;--project-color:'+project.color+';color:'+project.color+';background-color:'+project.color+'22" title="'+esc(projectDetails(project)+' · '+b.start+' – '+b.end+' · Kierowca: '+carDriverName(b)+(b.note?' · '+b.note:'')+(warningTitle?'\n'+warningTitle:''))+'">'+(b.start>=start?'<span class="resize-handle start" data-car-resize="start"></span>':'')+'<span class="bar-text">'+esc(projectLabel(project))+'</span>'+overlays+(b.end<=end?'<span class="resize-handle end" data-car-resize="end"></span>':'')+'</button>';
  }).join('');
  html+='<div class="row" data-car-row="'+esc(car.id)+'"><div class="label" title="'+esc(carTooltip(car))+'"><div class="car-calendar-label"><span class="person-name">'+esc(car.plate)+'</span><small class="car-model">'+esc(car.name)+'</small></div></div><div class="track" style="height:30px">'+grid+(today>=start&&today<=end?'<div class="today-line" style="left:'+(((dt(today)-dt(start))/DAY+.5)/days.length*100)+'%"></div>':'')+bars+'</div></div>';

 }
 chart.innerHTML=html+(count?'':'<div class="empty">Brak samochodów w tym widoku. Dodaj samochód lub zmień filtry.</div>');
 $('#cars-summary').textContent='Samochody: '+count+' / '+carsList().length+' · Rezerwacje w widoku: '+booked;
}
function carDialog(title,fields,kind,id){
 carEdit=id||null;carEditKind=kind;$('#car-modal').classList.toggle('car-details-modal',kind==='cars');$('#car-fields').classList.toggle('car-details-fields',kind==='cars');$('#car-modal-title').textContent=title;$('#car-fields').innerHTML=fields;$('#car-error').textContent='';$('#car-delete').hidden=!id;$('#car-modal').showModal();
}
function openCar(id){
 const c=carsList().find(x=>x.id===id)||{};
 const fields=field('Nr rej.','plate',c.plate||'','text','required maxlength="30"')+field('Marka i model','name',c.name||'','text','required maxlength="80"')+field('Kierowca','driver',c.driver||'','text','maxlength="120"')+field('Stan licznika (km)','odometer',c.odometer??'','number','min="0" max="99999999" step="1"')+['RO','SK','HU','CZ','AT'].map(country=>'<label>Winieta '+country+'<select data-vignette-mode="'+country+'"><option value="none" '+(!c['vignette'+country]?'selected':'')+'>Brak</option><option value="date" '+(c['vignette'+country]?'selected':'')+'>Data ważności</option></select><input aria-label="Winieta '+country+' — ważna do" type="date" name="vignette'+country+'" value="'+esc(c['vignette'+country]||'')+'"></label>').join('')+'<label>DE<select name="de"><option value=""></option><option value="Green Zone" '+(c.de==='Green Zone'?'selected':'')+'>Green Zone</option></select></label>'+field('PRZEGLĄD — ważny do','inspection',c.inspection||'','date')+field('OPONY','tires',c.tires||'','text','maxlength="250"')+field('KP O2 12.10.2026','kp',c.kp||'','text','maxlength="250"')+'<label class="car-wide-field">Uwagi<textarea name="notes" rows="2" maxlength="2000">'+esc(c.notes||'')+'</textarea></label>'+field('Liczba miejsc (łącznie z kierowcą)','seats',c.seats||5,'number','required min="1" max="100" step="1"')+'<label>Typ użytkowania<select name="usage"><option '+(c.usage==='Sekcyjne'?'selected':'')+'>Sekcyjne</option><option '+(c.usage==='Indywidualne'?'selected':'')+'>Indywidualne</option></select></label>'+field('Sekcja','owner',c.owner||'','text','maxlength="80"')+'<label id="car-owner-label">Stały użytkownik<select name="ownerId"><option value="">Wybierz osobę</option>'+data.people.map(p=>'<option value="'+esc(p.id)+'" '+((c.ownerId===p.id||!c.ownerId&&c.owner===p.name)?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label>';
 carDialog(id?'Edytuj samochód':'Dodaj samochód',fields,'cars',id);
 const usageInput=$('#car-fields [name=usage]'),ownerInput=$('#car-fields [name=ownerId]'),sectionInput=$('#car-fields [name=owner]'),legacyDriver=$('#car-fields [name=driver]');
 const syncOwner=()=>{
  const individual=usageInput.value==='Indywidualne';
  ownerInput.disabled=!individual;ownerInput.required=individual;ownerInput.parentElement.hidden=!individual;
  sectionInput.disabled=individual;sectionInput.parentElement.hidden=individual;
  legacyDriver.disabled=individual;legacyDriver.parentElement.hidden=individual;
 };
 usageInput.onchange=syncOwner;syncOwner();
 $('#car-fields').querySelectorAll('[data-vignette-mode]').forEach(select=>{
  const input=$('#car-fields [name=vignette'+select.dataset.vignetteMode+']');
  const sync=()=>{const active=select.value==='date';input.hidden=!active;input.disabled=!active;input.required=active};
  select.onchange=sync;sync();
 });

}
function carDriverName(booking){return data.people.find(p=>p.id===booking.driver)?.name||'Nieznany'}
function openCarReservation(id,preset={}){
 if(!carsList().length){toast('Najpierw dodaj samochód w zakładce Konfiguracja samochodów.');carsTab='fleet';renderCars();return}
 if(!data.projects.length){toast('Najpierw dodaj projekt w zakładce Projekty.');return}
 const b={...preset,...carBookings().find(x=>x.id===id)};
 carDialog(id?'Edytuj rezerwację':'Nowa rezerwacja samochodu','<label>Samochód<select name="car">'+carsList().map(c=>'<option value="'+esc(c.id)+'" '+(c.id===b.car?'selected':'')+'>'+esc(carCaption(c))+' · '+c.seats+' miejsc · '+esc(c.usage)+'</option>').join('')+'</select></label><label>Projekt — Skrót · Nr tematu · Nazwa<select name="project">'+data.projects.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===b.project?'selected':'')+'>'+esc(projectIdentity(p))+'</option>').join('')+'</select></label><div class="dates">'+field('Od','start',b.start||today,'date','required')+field('Do (włącznie)','end',b.end||b.start||today,'date','required')+'</div>'+'<label>Kierowca<select name="driver"></select></label><small>Auto indywidualne: stały użytkownik. Auto sekcyjne: Nieznany lub osoba pracująca przy projekcie w terminie rezerwacji.</small>'+field('Liczba osób (łącznie z kierowcą)','passengers',b.passengers||1,'number','required min="1" max="100" step="1"')+field('Notatka','note',b.note||'','text','maxlength="250"')+'<small>Rezerwacja zajmuje całe auto. Daty końcowe są wliczone. Nakładające się rezerwacje są blokowane.</small>','carReservations',id);
 const driverInput=$('#car-fields [name=driver]');
 function refreshDrivers(selected=driverInput.value){
  const booking={car:$('#car-fields [name=car]').value,project:$('#car-fields [name=project]').value,start:$('#car-fields [name=start]').value,end:$('#car-fields [name=end]').value};
  const people=eligibleCarDrivers(data,booking);
  const fixed=carsList().some(c=>c.id===booking.car&&c.usage==='Indywidualne'&&c.ownerId);
  driverInput.innerHTML=(fixed?'':'<option value="">Nieznany</option>')+people.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
  driverInput.value=fixed?people[0]?.id||'':people.some(p=>p.id===selected)?selected:'';
 }
 for(const name of ['car','project','start','end'])$('#car-fields [name='+name+']').addEventListener('change',()=>refreshDrivers());
 refreshDrivers(b.driver||'');
 const carInput=$('#car-fields [name=car]'),seatsInput=$('#car-fields [name=passengers]');carInput.onchange=()=>{seatsInput.max=carsList().find(c=>c.id===carInput.value).seats};carInput.onchange();
}
$('#car-form').onsubmit=e=>{
 e.preventDefault();const values=Object.fromEntries(new FormData(e.target));
 if(carEditKind==='cars'){values.name=values.name.trim();values.plate=values.plate.trim().toUpperCase();values.owner=(values.owner||'').trim();if(values.usage==='Indywidualne'){if(!data.people.some(p=>p.id===values.ownerId)){$('#car-error').textContent='Wybierz stałego użytkownika z listy osób.';return}values.owner=data.people.find(p=>p.id===values.ownerId).name}values.seats=Number(values.seats);for(const key of carExtraFields){if(typeof values[key]==='string')values[key]=values[key].trim();if(values[key]==='')delete values[key]}if(values.odometer!==undefined)values.odometer=Number(values.odometer)}else{values.passengers=Number(values.passengers);if(!values.driver)delete values.driver;}
 values.id=carEdit||nextFleetId(carEditKind==='cars'?carsList():carBookings(),carEditKind==='cars'?'a':'ra');
 try{const items=carEditKind==='cars'?carsList():carBookings();fleetChange(carEditKind,carEdit?items.map(x=>x.id===carEdit?values:x):[...items,values]);$('#car-modal').close();toast('Zastosowano zmiany — kliknij Zapisz, aby zapisać plik.')}catch(error){$('#car-error').textContent=error.message}
};
$('#car-delete').onclick=()=>{
 const count=carEditKind==='cars'?carBookings().filter(b=>b.car===carEdit).length:0;
 if(!confirm(carEditKind==='cars'?'Usunąć samochód'+(count?' i jego rezerwacje ('+count+')':'')+'?':'Usunąć rezerwację?'))return;
 const next=carEditKind==='cars'?{...data,cars:carsList().filter(c=>c.id!==carEdit),carReservations:carBookings().filter(b=>b.car!==carEdit)}:{...data,carReservations:carBookings().filter(b=>b.id!==carEdit)};
 try{validateFleet(next);data=next;save();$('#car-modal').close()}catch(error){$('#car-error').textContent=error.message}
};
$('#car-close').onclick=$('#car-cancel').onclick=()=>$('#car-modal').close();
$('#cars-calendar-tab').onclick=()=>{carsTab='calendar';renderCars()};$('#cars-list-tab').onclick=()=>{carsTab='fleet';renderCars()};$('#cars-new-car').onclick=()=>openCar();
for(const id of ['#cars-project-filter','#cars-usage-filter','#cars-unit'])$(id).onchange=renderCars;
$('#cars-search').oninput=renderCars;
$('#cars-scale').onchange=()=>{if(monthCount($('#cars-scale').value)>=6)$('#cars-unit').value='weeks';renderCars()};
for(const [id,step] of [['#cars-prev',-1],['#cars-next',1]])$(id).onclick=()=>{carsCursor=$('#cars-scale').value==='week'?new Date(+carsCursor+step*7*DAY):new Date(Date.UTC(carsCursor.getUTCFullYear(),carsCursor.getUTCMonth()+step*monthCount($('#cars-scale').value),1));renderCars()};
$('#cars-today').onclick=()=>{carsCursor=dt(today);renderCars()};
// Draw, move and resize reservations. Changes are validated before touching data.
const carsChart=$('#cars-chart');
function carDayAt(track,x){const [start,end]=carsBounds(),n=(dt(end)-dt(start))/DAY+1,rect=track.getBoundingClientRect();return plus(start,Math.max(0,Math.min(n-1,Math.floor((x-rect.left)/rect.width*n))))}
carsChart.addEventListener('pointerdown',e=>{
 if(e.button!==0||carDrag)return;const track=e.target.closest('.track');if(!track)return;
 const bar=e.target.closest('[data-booking]'),booking=bar?carBookings().find(b=>b.id===bar.dataset.booking):null;
 const [start,end]=carsBounds(),car=track.closest('[data-car-row]').dataset.carRow;
 carDrag={pointer:e.pointerId,x:e.clientX,y:e.clientY,track,bar,booking,car,target:car,start,end,days:(dt(end)-dt(start))/DAY+1,width:track.getBoundingClientRect().width,mode:booking?(e.target.dataset.carResize||'move'):'new',anchor:carDayAt(track,e.clientX),moved:false};
 if(!bar){const preview=document.createElement('div');preview.className='new-assignment-preview';preview.style.top='4px';track.append(preview);carDrag.bar=preview}
 e.preventDefault();carsChart.setPointerCapture(e.pointerId);updateCarDrag(e);
});
function updateCarDrag(e){
 const d=carDrag,dx=e.clientX-d.x,dy=e.clientY-d.y;d.moved=d.moved||Math.abs(dx)>4||Math.abs(dy)>4;
 let start,end;d.validTarget=true;
 if(d.mode==='new'){const day=carDayAt(d.track,e.clientX);start=day<d.anchor?day:d.anchor;end=day>d.anchor?day:d.anchor}
 else{const offset=Math.round(dx/d.width*d.days);start=d.booking.start;end=d.booking.end;
  if(d.mode==='move'){start=plus(start,offset);end=plus(end,offset);const row=[...carsChart.querySelectorAll('[data-car-row]')].find(row=>{const r=row.getBoundingClientRect();return e.clientY>=r.top&&e.clientY<r.bottom&&e.clientX>=r.left&&e.clientX<=r.right});d.validTarget=!!row;d.target=row?.dataset.carRow||d.car;d.bar.style.transform=row?'translateY('+(row.getBoundingClientRect().top-d.track.closest('[data-car-row]').getBoundingClientRect().top)+'px)':''}
  else if(d.mode==='start'){start=plus(start,offset);if(start>end)start=end}else{end=plus(end,offset);if(end<start)end=start}
 }
 d.newStart=start;d.newEnd=end;const span=reportSpan(start,end,d.start,d.end);d.bar.style.left=span.left+'%';d.bar.style.width=span.width+'%';d.bar.classList.toggle('dragging',d.moved);$('#cars-summary').textContent=start+' – '+end+' · '+(d.validTarget?carCaption(carsList().find(c=>c.id===d.target)):'Poza wierszem — anulowanie')+' · Esc: anuluj';
}
carsChart.addEventListener('pointermove',e=>{if(carDrag?.pointer===e.pointerId)updateCarDrag(e)});
function finishCarDrag(cancel=false){
 const d=carDrag;if(!d)return;carDrag=null;if(carsChart.hasPointerCapture(d.pointer))carsChart.releasePointerCapture(d.pointer);
 if(cancel||!d.validTarget){renderCars();return}
 if(d.mode==='new'){renderCars();openCarReservation(null,{car:d.car,start:d.newStart,end:d.newEnd,project:$('#cars-project-filter').value});return}
 if(!d.moved){renderCars();openCarReservation(d.booking.id);return}
 try{fleetChange('carReservations',carBookings().map(b=>b.id===d.booking.id?{...b,car:d.target,start:d.newStart,end:d.newEnd}:b));toast('Zmieniono rezerwację — kliknij Zapisz.')}catch(error){renderCars();toast(error.message)}
}
carsChart.addEventListener('pointerup',e=>{if(carDrag?.pointer===e.pointerId){updateCarDrag(e);finishCarDrag()}});
carsChart.addEventListener('pointercancel',()=>finishCarDrag(true));carsChart.addEventListener('lostpointercapture',()=>finishCarDrag(true));window.addEventListener('blur',()=>finishCarDrag(true));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&carDrag){e.preventDefault();finishCarDrag(true)}});
carsChart.addEventListener('click',e=>{if(e.detail===0){const bar=e.target.closest('[data-booking]');if(bar)openCarReservation(bar.dataset.booking)}});
let carsWheel=0,carsZoomAt=0;
carsChart.addEventListener('wheel',e=>{
 if(!e.ctrlKey){carsWheel=0;return}if(carDrag||e.shiftKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
 e.preventDefault();if(Date.now()-carsZoomAt<200)return;carsWheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?200:1);if(Math.abs(carsWheel)<40)return;
 const next=zoomScale($('#cars-scale').value,carsWheel>0?1:-1);carsWheel=0;
 const track=e.target.closest('.track')||carsChart.querySelector('.track');if(track)carsCursor=dt(carDayAt(track,e.clientX));$('#cars-scale').value=next;$('#cars-unit').value=monthCount(next)>=6?'weeks':'days';carsZoomAt=Date.now();renderCars();
},{passive:false});

// The header moves the visible window only; assignment dates remain untouched.
function enableCalendarPan(chart,options){
 let pan=null,frame=null,pendingX=0;
 const paint=x=>{
  if(!pan)return;
  const dx=x-pan.x;
  if(!pan.moved&&Math.abs(dx)<4)return;
  pan.moved=true;
  const offset=-Math.round(dx/pan.width*pan.days/pan.step)*pan.step;
  if(offset===pan.offset)return;
  const start=plus(pan.start,offset),end=plus(pan.end,offset);
  if(start<'1900-01-01'||end>'9999-12-31')return;
  pan.offset=offset;
  const date=dt(start);date.panWindow={scale:pan.scale,end};
  options.set(date);options.render();
 };
 const finish=cancel=>{
  if(!pan)return;
  if(frame!==null){cancelAnimationFrame(frame);frame=null}
  const previous=pan;pan=null;chart.classList.remove('calendar-panning');
  if(cancel){options.set(previous.cursor);options.restore?.(previous.extra);options.renderCancel()}
  if(chart.hasPointerCapture(previous.pointer))chart.releasePointerCapture(previous.pointer);
 };
 chart.addEventListener('pointerdown',e=>{
  const header=e.target.closest('.head .days');
  if(e.button!==0||!header||pan)return;
  e.preventDefault();
  const [start,end]=options.bounds();
  pan={pointer:e.pointerId,x:e.clientX,width:header.getBoundingClientRect().width,start,end,days:(dt(end)-dt(start))/DAY+1,step:options.unit()==='weeks'?7:1,scale:options.scale(),cursor:options.get(),offset:0,moved:false,extra:options.snapshot?.()};
  chart.classList.add('calendar-panning');chart.setPointerCapture(e.pointerId);
 });
 chart.addEventListener('pointermove',e=>{
  if(pan?.pointer!==e.pointerId)return;
  pendingX=e.clientX;
  if(frame===null)frame=requestAnimationFrame(()=>{frame=null;paint(pendingX)});
 });
 chart.addEventListener('pointerup',e=>{if(pan?.pointer===e.pointerId){paint(e.clientX);finish(false)}});
 chart.addEventListener('pointercancel',()=>finish(true));
 chart.addEventListener('lostpointercapture',()=>finish(true));
 window.addEventListener('blur',()=>finish(true));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pan){e.preventDefault();finish(true)}});
 chart.addEventListener('wheel',e=>{if(pan)e.stopImmediatePropagation()},true);
}
enableCalendarPan($('#chart'),{
 get:()=>cursor,set:value=>cursor=value,bounds:()=>bounds(),scale:()=>$('#scale').value,unit:()=>displaySettings().unit,render:render,renderCancel:render
});
enableCalendarPan(carsChart,{
 get:()=>carsCursor,set:value=>carsCursor=value,bounds:carsBounds,scale:()=>$('#cars-scale').value,unit:()=>$('#cars-unit').value,render:renderCars,renderCancel:renderCars
});
enableCalendarPan(rangeChart,{
 get:()=>rangeCursor,set:value=>rangeCursor=value,bounds:rangeBounds,scale:()=>$('#range-scale').value,unit:()=>$('#range-unit').value,
 render:selectVisibleReportRange,renderCancel:()=>{renderRangeCalendar();renderReports()},
 snapshot:()=>[$('#report-start').value,$('#report-end').value],
 restore:values=>{$('#report-start').value=values[0];$('#report-end').value=values[1]}
});
