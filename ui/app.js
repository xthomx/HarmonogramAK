function isReservationProject(id){return id==='__reservation_without_project__'}
function ensureReservationProject(plan){
 const fixed={id:'__reservation_without_project__',name:'Rezerwacja bez projektu',shortName:'Rezerwacja',topicNumber:'',description:'Termin zarezerwowany — projekt do ustalenia.',color:'#788391'};
 const index=plan.projects.findIndex(p=>isReservationProject(p.id));
 if(index<0)plan.projects.push(fixed);else plan.projects[index]=fixed;
 return plan;
}
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),DAY=86400000,key='plan-zespolu-v1';
const iso=d=>d.toISOString().slice(0,10),dt=s=>new Date(s+'T00:00:00Z'),plus=(s,n)=>iso(new Date(+dt(s)+n*DAY)),today=new Date().toLocaleDateString('sv-SE'),uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');let cursor=dt(today),view='plan',edit=null,kind='assignments';
function demo(){let m=today.slice(0,7),d=n=>m+'-'+String(n).padStart(2,'0');return{demo:true,people:[{id:'p1',name:'Anna Kowalska',role:'Software'},{id:'p2',name:'Piotr Nowak',role:'Elektryka'},{id:'p3',name:'Marta Wiśniewska',role:'Mechanika'},{id:'p4',name:'Tomasz Zieliński',role:'Software'},{id:'p5',name:'Karolina Wójcik',role:'Uruchomienia'},{id:'p6',name:'Michał Lewandowski',role:'Mechanika'}],projects:[{id:'j1',name:'Linia pakująca',color:'#347c68'},{id:'j2',name:'Modernizacja hali',color:'#587fba'},{id:'j3',name:'System wizyjny',color:'#9171b0'},{id:'j4',name:'Stanowisko montażowe',color:'#bb8a40'}],assignments:[['p1','j1',2,14,100],['p1','j3',17,27,100],['p2','j2',5,23,100],['p3','j4',1,12,100],['p3','j1',15,28,100],['p4','j3',4,20,70],['p4','j1',15,26,50],['p5','j2',12,25,100],['p6','j4',6,19,100]].map((a,i)=>({id:'a'+i,person:a[0],project:a[1],start:d(a[2]),end:d(a[3]),load:a[4],note:''}))}}
let data=ensureReservationProject({people:[],projects:[],assignments:[]}),fileHandle=null,fileName='',filePath='',fileBusy=false,fileNotice='',savedSnapshot=JSON.stringify(data),recovered=false;

function isDirty(){return JSON.stringify(data)!==savedSnapshot}
function updateFileStatus(){$('#current-file').textContent='Plik: '+(fileName||'Nowy plan')+(isDirty()?' • niezapisane zmiany':'');$('#current-file').title=filePath||fileName;$('#file-name').title=filePath||fileName;document.title='Plan zespołu — '+(fileName||'Nowy plan');const state=fileBusy?'Operacja na pliku…':fileNotice|| (isDirty()?'● Niezapisane zmiany':fileName?'Zapisano w pliku':'Plan nie jest zapisany w pliku');$('#file-name').textContent=fileName|| (recovered?'Plan z poprzedniej wersji':'Nowy plan');$('#file-state').textContent=state;$('#save-status').textContent=state;$('#file-state').classList.toggle('unsaved',isDirty());for(const id of ['#import','#export','#save-as','#disk-format'])$(id).disabled=fileBusy;$('#file-help').textContent='Zmiany trafiają do wybranego pliku na dysku dopiero po kliknięciu Zapisz.';}
function save(){normalizeBookingDrivers(data);fileNotice='';render();updateFileStatus()}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3200)}
function monthCount(scale=$('#scale').value){return ({twoMonths:2,threeMonths:3,sixMonths:6,year:12})[scale]||1}
function bounds(at=cursor,scale=$('#scale').value){if(at.panWindow?.scale===scale)return [iso(at),at.panWindow.end];delete at.panWindow;if(scale==='year')return [iso(new Date(Date.UTC(at.getUTCFullYear(),0,1))),iso(new Date(Date.UTC(at.getUTCFullYear(),11,31)))];if(scale==='week'){let d=new Date(at);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return[iso(d),plus(iso(d),6)]}return[iso(new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),1))),iso(new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth()+monthCount(scale),0)))]}
function overloaded(a){const related=data.assignments.filter(b=>b.person===a.person&&b.start<=a.end&&b.end>=a.start);const dates=[a.start,...related.map(b=>b.start).filter(s=>s>=a.start&&s<=a.end)];return dates.some(d=>related.filter(b=>b.start<=d&&b.end>=d).reduce((n,b)=>n+b.load,0)>100)}
const labelModes=['name','shortName','topicNumber','description','topicShort','all'];
function displaySettings(){const v=data.calendarDisplay;return {label:labelModes.includes(v?.label)?v.label:'name',showLoad:typeof v?.showLoad==='boolean'?v.showLoad:true,unit:v?.unit==='weeks'?'weeks':'days'}}
function assignmentStage(a){return a.stage||'Offline'}
function projectIdentity(p){return [p.shortName,p.topicNumber,p.name].filter(v=>v&&v.trim()).join(' · ')}
function projectText(p){return [p.name,p.shortName,p.topicNumber,p.description].filter(Boolean).join(' · ')}
function projectLabel(p){const mode=displaySettings().label;let label=mode==='all'?projectText(p):mode==='topicShort'?[p.topicNumber,p.shortName].filter(Boolean).join(' · '):p[mode];return label?.trim()||p.name}
function projectDetails(p){return [p.name,p.shortName&&'Skrót: '+p.shortName,p.topicNumber&&'Nr tematu: '+p.topicNumber,p.description&&'Opis: '+p.description].filter(Boolean).join(' • ')}
function groupName(p){return (p.group||'').trim()}
function groupKey(p){return groupName(p).toLocaleLowerCase('pl')}
function groupList(){const groups=new Map();for(const p of data.people)if(groupName(p))groups.set(groupKey(p),groupName(p));return [...groups].sort((a,b)=>a[1].localeCompare(b[1],'pl'))}
function filterValues(value){return Array.isArray(value)?value.filter(v=>typeof v==='string'&&v):typeof value==='string'&&value?[value]:[]}
function specializationKey(p){return (p.role||'').trim()?'spec:'+(p.role||'').trim().toLocaleLowerCase('pl'):'__none__'}
function specializationList(){const entries=new Map();for(const p of data.people)if((p.role||'').trim())entries.set(specializationKey(p),p.role.trim());return [...entries].sort((a,b)=>a[1].localeCompare(b[1],'pl'))}
function selectedFilters(){const f=data.calendarFilters||{};return {project:filterValues(f.project).filter(id=>data.projects.some(p=>p.id===id)),person:filterValues(f.person).filter(id=>data.people.some(p=>p.id===id)),group:f.group||'',specialization:filterValues(f.specialization).filter(k=>k==='__none__'||specializationList().some(([id])=>id===k))}}
function syncFilters(){const f=selectedFilters();for(const [kind,items,all] of [['project',data.projects.map(p=>[p.id,[p.topicNumber,p.shortName,p.name].filter(Boolean).join(' · ')]),'Wszystkie tematy'],['person',data.people.map(p=>[p.id,p.name]),'Wszystkie osoby'],['specialization',[['__none__','Bez specjalizacji'],...specializationList()],'Wszystkie specjalizacje']]){const chosen=f[kind];$('#filter-'+kind+'-summary').textContent=chosen.length?`Wybrano: ${chosen.length}`:all;$('#filter-'+kind+'-options').innerHTML=items.map(([id,name])=>`<label><input type="checkbox" data-filter-kind="${kind}" value="${esc(id)}" ${chosen.includes(id)?'checked':''}><span>${esc(name)}</span></label>`).join('')||'<small>Lista jest pusta.</small>';}const items=[['','Wszystkie grupy'],['__none__','Bez grupy'],...groupList().map(([k,n])=>['group:'+k,n])],el=$('#filter-group');el.innerHTML=items.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');el.value=items.some(([v])=>v===f.group)?f.group:'';f.group=el.value;return f}

function calendarRows(start,end,f){const q=$('#search').value.trim().toLocaleLowerCase('pl');return data.people.filter(p=>(!f.person.length||f.person.includes(p.id))&&(!f.specialization?.length||f.specialization.includes(specializationKey(p)))&&(!f.group||(f.group==='__none__'?!groupName(p):'group:'+groupKey(p)===f.group))).map(p=>{let own=data.assignments.filter(a=>a.person===p.id&&a.start<=end&&a.end>=start&&(!f.project.length||f.project.includes(a.project)));const personMatch=`${p.name} ${p.role||''} ${groupName(p)}`.toLocaleLowerCase('pl').includes(q);if(q&&!personMatch)own=own.filter(a=>projectText(data.projects.find(j=>j.id===a.project)).toLocaleLowerCase('pl').includes(q));return {p,own,include:(!f.project.length||own.length>0)&&(!q||personMatch||own.length>0)}}).filter(r=>r.include)}
function weekColumns(days){const result=[];for(const day of days){const date=dt(day),monday=plus(day,-(date.getUTCDay()+6)%7);let column=result.at(-1);if(!column||column.key!==monday){const thursday=dt(plus(monday,3)),year=thursday.getUTCFullYear(),first=new Date(Date.UTC(year,0,1)),number=Math.ceil((((thursday-first)/DAY)+1)/7);column={key:monday,number,year,start:day,end:day,count:0};result.push(column)}column.count++;column.end=day}return result}

function personPeakLoads(assignments,start,end){
 const events=new Map(),peaks=new Map();
 for(const a of assignments){
  const first=Math.max(+dt(start),+dt(a.start)),last=Math.min(+dt(end),+dt(a.end));
  if(first>last)continue;
  if(!events.has(a.person))events.set(a.person,new Map());
  const points=events.get(a.person);
  points.set(first,(points.get(first)||0)+a.load);
  points.set(last+DAY,(points.get(last+DAY)||0)-a.load);
 }
 for(const [person,points] of events){
  let current=0,peak=0;
  for(const [,change] of [...points].sort((a,b)=>a[0]-b[0])){current+=change;peak=Math.max(peak,current)}
  peaks.set(person,peak);
 }
 return peaks;
}

function render(){ensureReservationProject(data);$('#generate-colors').hidden=view!=='projects';$('#generate-colors').disabled=!data.projects.some(p=>!isReservationProject(p.id));const settings=displaySettings();$('#calendar-unit').value=settings.unit;$('#bar-label').value=settings.label;$('#show-load').checked=settings.showLoad;const filters=syncFilters(),[start,end]=bounds(),n=(dt(end)-dt(start))/DAY+1,rows=calendarRows(start,end,filters),visible=rows.flatMap(r=>r.own),peakLoads=personPeakLoads(data.assignments,start,end),bad=new Set(rows.filter(r=>(peakLoads.get(r.p.id)||0)>100).map(r=>r.p.id));$('#filter-summary').textContent=`Widoczne osoby: ${rows.length} / ${data.people.length} · Przypisania: ${visible.length}. Filtry można łączyć.`;$('#stats').innerHTML=[['Osoby w widoku',rows.length,'osób'],['Projekty w okresie',new Set(visible.map(a=>a.project)).size,'projektów'],['Przypisania',visible.length,'w okresie'],['Przeciążenia',bad.size,'osób w okresie']].map((x,i)=>`<div class="stat"><small>${x[0]}</small><strong class="${i===3&&x[1]?'warn':''}">${x[1]}<em>${x[2]}</em></strong></div>`).join('');const monthTitle=d=>dt(d).toLocaleDateString('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'});$('#period').textContent=$('#scale').value==='week'?`${start.slice(8)}.${start.slice(5,7)} – ${end.slice(8)}.${end.slice(5,7)}.${end.slice(0,4)}`:start.slice(0,7)===end.slice(0,7)?monthTitle(start):`${monthTitle(start)} – ${monthTitle(end)}`;
const days=Array.from({length:n},(_,i)=>plus(start,i)),weekly=settings.unit==='weeks',weeks=weekColumns(days),shortDate=d=>d.slice(8)+'.'+d.slice(5,7);$('#chart').classList.toggle('weekly-view',weekly);$('#chart').classList.toggle('long-view',weekly&&monthCount()>=6);const weekend=d=>[0,6].includes(dt(d).getUTCDay());const months=[];for(const day of days){const key=day.slice(0,7);if(months.at(-1)?.key===key)months.at(-1).count++;else months.push({key,date:day,count:1})}let html=(monthCount()>1?`<div class="row month-head"><div class="label">MIESIĄCE</div><div class="month-segments">${months.map(m=>`<div style="flex:${m.count}" title="${esc(monthTitle(m.date))}">${esc(weekly?dt(m.date).toLocaleDateString('pl-PL',{month:'short',timeZone:'UTC'}):monthTitle(m.date))}</div>`).join('')}</div></div>`:'')+`<div class="row head"><div class="label">OSOBA / SPECJALIZACJA</div><div class="days" title="Przeciągnij w lewo lub w prawo, aby przesunąć daty. Esc — anuluj.">${weekly?weeks.map(w=>`<div class="week-column ${today>=w.start&&today<=w.end?'current-week':''}" style="flex:${w.count}" title="Tydzień ${w.number}, ${w.year}: ${w.start} – ${w.end}"><strong>${w.number}</strong><small>${shortDate(w.start)}–${shortDate(w.end)}</small></div>`).join(''):days.map(d=>`<div class="day ${weekend(d)?'weekend':''} ${d===today?'today':''}">${['N','P','W','Ś','C','P','S'][dt(d).getUTCDay()]}<b>${+d.slice(8)}</b></div>`).join('')}</div></div>`;const q=$('#search').value.toLocaleLowerCase('pl');let count=0;
for(const {p,own} of rows){count++;let lanes=[];const bars=own.sort((a,b)=>a.start.localeCompare(b.start)).map(a=>{let lane=lanes.findIndex(e=>e<a.start);if(lane<0)lane=lanes.length;lanes[lane]=a.end;let j=data.projects.find(j=>j.id===a.project),left=Math.max(0,(dt(a.start)-dt(start))/DAY),right=Math.min(n,(dt(a.end)-dt(start))/DAY+1);return `<button class="bar ${assignmentStage(a)==='Uruchomienie'?'commissioning':''} ${overloaded(a)?'conflict':''}" data-edit="${esc(a.id)}" style="--project-color:${j.color};left:calc(${left/n*100}% + 3px);width:calc(${(right-left)/n*100}% - 6px);top:${7+lane*28}px;color:${j.color};background-color:${j.color}22" title="${esc(projectDetails(j))} • ${esc(assignmentStage(a))} • ${a.start} – ${a.end} • ${a.load}%${overloaded(a)?' • Przeciążenie':''}">${a.start>=start?'<span class="resize-handle start" data-resize="start" title="Przeciągnij, aby zmienić początek" aria-hidden="true"></span>':''}<span class="bar-text">${assignmentStage(a)==='Uruchomienie'?'⚡ ':''}${esc(projectLabel(j))}${settings.showLoad?' · '+a.load+'%':''}</span>${a.end<=end?'<span class="resize-handle end" data-resize="end" title="Przeciągnij, aby zmienić koniec" aria-hidden="true"></span>':''}</button>`}).join('');html+=`<div class="row ${bad.has(p.id)?'person-overloaded':''}" data-person-id="${esc(p.id)}"><div class="label"><span class="avatar">${esc(p.name.split(' ').map(s=>s[0]).slice(0,2).join(''))}</span><div><div class="person-name" title="${esc(p.name)}">${esc(p.name)}</div><div class="role">${esc([p.role,groupName(p)&&'Grupa: '+groupName(p)].filter(Boolean).join(' · ')||'Członek zespołu')}${bad.has(p.id)?` <span class="overload-badge" title="Maksymalne łączne zaangażowanie w jednym dniu tego okresu, ze wszystkich projektów: ${peakLoads.get(p.id)}%" aria-label="Przeciążenie: maksymalnie ${peakLoads.get(p.id)} procent">⚠ ${peakLoads.get(p.id)}%</span>`:''}</div></div></div><div class="track" style="height:${Math.max(38,lanes.length*28+10)}px"><div class="grid-bg">${weekly?weeks.map(w=>`<div class="cell week-cell" style="flex:${w.count}"></div>`).join(''):days.map(d=>`<div class="cell ${weekend(d)?'weekend':''}"></div>`).join('')}</div>${today>=start&&today<=end?`<div class="today-line" style="left:${((dt(today)-dt(start))/DAY+.5)/n*100}%"></div>`:''}${bars}</div></div>`}$('#chart').innerHTML=html+(count?'':'<div class="empty">Brak wyników w tym okresie. Zmień okres, wyczyść filtry lub dodaj osobę i przypisanie.</div>');document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open('assignments',b.dataset.edit));
document.body.classList.toggle('schedule-view',['plan','cars'].includes(view));$('#plan').hidden=view!=='plan';$('#catalog').hidden=!['people','projects'].includes(view);$('#reports').hidden=view!=='reports';$('#cars').hidden=view!=='cars';$('#add').hidden=view==='reports';$('#title').textContent={plan:'Harmonogram zespołu',people:'Osoby w zespole',projects:'Projekty',reports:'Raporty dostępności',cars:'Rezerwacje samochodów'}[view];$('#add').textContent={plan:'＋ Nowe przypisanie',people:'＋ Dodaj osobę',projects:'＋ Dodaj projekt'}[view];if(['people','projects'].includes(view)){renderCatalog()}if(view==='reports'){renderReports()}if(view==='cars'){renderCars()}}
function catalogCell(value,extra=''){const text=String(value||'—');return `<div class="catalog-cell ${extra}" title="${esc(text)}">${esc(text)}</div>`}
function renderCatalog(){
 const projects=view==='projects',el=$('#catalog');
 el.classList.add('compact-catalog');
 const headers=projects?['Nr tematu','Skrót','Nazwa projektu','Opis','Przypisania','']:['Imię i nazwisko','Specjalizacja','Grupa','Przypisania',''];
 const layout=projects?'project-columns':'people-columns';
 const rows=data[view].map(x=>{
  const count=data.assignments.filter(a=>a[projects?'project':'person']===x.id).length;
  const cells=projects?
   catalogCell(x.topicNumber)+`<div class="catalog-cell" title="${esc(x.shortName||'—')}"><span class="swatch" style="background:${x.color}"></span>${esc(x.shortName||'—')}</div>`+catalogCell(x.name,'catalog-name')+catalogCell(x.description,'catalog-description'):
   catalogCell(x.name,'catalog-name')+catalogCell(x.role)+catalogCell(groupName(x));
  return `<div class="catalog-row ${layout}">${cells}${catalogCell(count.toString(),'catalog-count')}${projects&&isReservationProject(x.id)?'<span class="fixed-project-label" title="Stała pozycja — nie można edytować ani usunąć">Stały</span>':`<button data-item="${esc(x.id)}" aria-label="Edytuj: ${esc(x.name)}">Edytuj</button>`}</div>`;
 }).join('');
 el.innerHTML=`<div class="catalog-table"><div class="catalog-heading ${layout}">${headers.map(h=>`<span>${h}</span>`).join('')}</div>${rows||'<div class="empty">Lista jest pusta. Dodaj pierwszy wpis.</div>'}</div>`;
 el.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>open(view,b.dataset.item));
}
function field(label,name,value='',type='text',extra=''){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function assignmentPeople(x){
 const chosen=x.people||[x.person||data.people[0]?.id];
 const people=data.people.filter(p=>p.id!==x.copyFrom);
 return `<fieldset class="assignment-people"><legend>Osoby — zaznacz jedną lub więcej</legend><div class="assignment-people-list">${people.map(p=>`<label><input type="checkbox" name="people" value="${esc(p.id)}" ${chosen.includes(p.id)?'checked':''}><span>${esc(p.name)}<small>${esc([p.role,p.group].filter(Boolean).join(' · '))}</small></span></label>`).join('')||'<small>Brak innych osób. Dodaj osobę w zakładce Osoby.</small>'}</div></fieldset>`;
}
function makeAssignments(values,selected,people,idFactory){
 const ids=[...new Set(selected)];
 if(!ids.length)throw Error('Zaznacz co najmniej jedną osobę.');
 if(ids.some(id=>!people.some(p=>p.id===id)))throw Error('Wybrana osoba już nie istnieje.');
 const load=Number(values.load);
 if(!Number.isInteger(load)||load<1||load>100)throw Error('Zaangażowanie musi wynosić od 1 do 100%.');
 if(!values.start||!values.end||values.end<values.start)throw Error('Sprawdź daty przypisania.');
 return ids.map(person=>({id:idFactory(),person,project:values.project,start:values.start,end:values.end,load,note:values.note||'',stage:values.stage||'Offline'}));
}

function splitAssignment(source,secondStart,idFactory){
 const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+dt(s))&&iso(dt(s))===s;
 if(!source||!dateOK(source.start)||!dateOK(source.end)||source.start>source.end)throw Error('Sprawdź daty przypisania.');
 if(source.start===source.end)throw Error('Zadania jednodniowego nie można podzielić.');
 if(!dateOK(secondStart)||secondStart<=source.start||secondStart>source.end)throw Error('Wybierz pierwszy dzień drugiej części: po początku zadania, nie później niż jego koniec.');
 return [{...source,end:plus(secondStart,-1)},{...source,id:idFactory(),start:secondStart}];
}

function open(k,id,preset={}){if(k==='projects'&&isReservationProject(id)){toast('To stała rezerwacja bez projektu — nie można jej edytować ani usunąć.');return}kind=k;edit=id||null;let x=data[k].find(x=>x.id===id)||preset;if(k==='assignments'&&(!data.people.length||!data.projects.length)){toast('Najpierw dodaj co najmniej jedną osobę i projekt.');return}$('#modal-title').textContent=(id?'Edytuj ':'Dodaj ')+{assignments:'przypisanie',people:'osobę',projects:'projekt'}[k];$('#delete').hidden=!id;$('#copy-assignment').hidden=!(k==='assignments'&&id);$('#split-assignment').hidden=!(k==='assignments'&&id);if(preset.copyFrom)$('#modal-title').textContent='Kopiuj przypisanie dla innych osób';$('#form-error').textContent='';if(k==='assignments'){$('#fields').innerHTML=`${id?`<label>Osoba<select name="person">${data.people.map(p=>`<option value="${esc(p.id)}" ${x.person===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>`:assignmentPeople(x)}<label>Projekt — Skrót · Nr tematu · Nazwa projektu<select name="project">${data.projects.map(p=>`<option value="${esc(p.id)}" ${x.project===p.id?'selected':''}>${esc(projectIdentity(p))}</option>`).join('')}</select></label><div class="dates">${field('Od','start',x.start||today,'date','required')}${field('Do (włącznie)','end',x.end||plus(today,6),'date','required')}</div>${field('Zaangażowanie (%)','load',x.load||100,'number','required min="1" max="100" step="1"')}<label>Etap zadania<select name="stage"><option value="Offline" ${assignmentStage(x)==='Offline'?'selected':''}>Offline</option><option value="Uruchomienie" ${assignmentStage(x)==='Uruchomienie'?'selected':''}>Uruchomienie</option></select></label>${field('Notatka','note',x.note||'','text','maxlength="250"')}<small>Równoległe przypisania są dozwolone. Suma ponad 100% zostanie oznaczona w kalendarzu.</small>`}else $('#fields').innerHTML=(k==='people'?field('Imię i nazwisko','name',x.name||'','text','required maxlength="80"')+field('Specjalizacja / dział','role',x.role||'','text','maxlength="80"')+field('Grupa','group',x.group||'','text','maxlength="80" placeholder="Wpisz nazwę grupy"')+'<small>Wpisz dowolną nazwę grupy. Puste pole oznacza brak grupy.</small>':field('Nr tematu','topicNumber',x.topicNumber||'','text','maxlength="80"')+field('Skrót','shortName',x.shortName||'','text','maxlength="40"')+field('Nazwa projektu','name',x.name||'','text','required maxlength="80"')+`<label>Opis projektu<textarea name="description" rows="4" maxlength="2000">${esc(x.description||'')}</textarea></label>`+field('Kolor projektu','color',x.color||'#347c68','color'));$('#modal').showModal()}
$('#form').onsubmit=e=>{e.preventDefault();if(kind==='projects'&&isReservationProject(edit))return;const formValues=new FormData(e.target);let x=Object.fromEntries(formValues);if(kind==='assignments'&&!edit){
 try{
  const items=makeAssignments(x,formValues.getAll('people'),data.people,uid);
  if(!data.projects.some(p=>p.id===x.project))throw Error('Wybierz istniejący projekt.');
  if(data.assignments.length+items.length>10000)throw Error('Plan może zawierać maksymalnie 10000 przypisań.');
  data.assignments.push(...items);save();$('#modal').close();toast('Dodano przypisania: '+items.length+' — kliknij Zapisz, aby zapisać plik');
 }catch(error){$('#form-error').textContent=error.message}
 return;
}if(kind==='assignments'){x.load=Number(x.load);if(x.end<x.start){$('#form-error').textContent='Data zakończenia nie może być wcześniejsza niż rozpoczęcia.';return}}else{ x.name=x.name.trim();if(kind==='people'){x.group=x.group.trim();}if(kind==='projects')for(const k of ['shortName','topicNumber','description'])x[k]=x[k].trim();if(!x.name){$('#form-error').textContent='Wpisz nazwę.';return}}x.id=edit||uid();if(edit)data[kind]=data[kind].map(a=>a.id===edit?x:a);else data[kind].push(x);save();$('#modal').close();toast('Zastosowano zmiany — kliknij 💾 Zapisz, aby zapisać plik')};$('#delete').onclick=()=>{if(kind==='people'&&(data.cars||[]).some(c=>c.ownerId===edit)){toast('Najpierw zmień stałego użytkownika przypisanego samochodu.');return}if(kind==='projects'&&isReservationProject(edit))return;let count=kind==='assignments'?0:data.assignments.filter(a=>a[kind==='people'?'person':'project']===edit).length+(kind==='projects'?(data.carReservations||[]).filter(b=>b.project===edit).length:0);if(!confirm(count?`Usunąć wpis i ${count} powiązanych przypisań / rezerwacji?`:'Usunąć ten wpis?'))return;data[kind]=data[kind].filter(x=>x.id!==edit);if(kind!=='assignments')data.assignments=data.assignments.filter(a=>a[kind==='people'?'person':'project']!==edit);if(kind==='projects'&&data.cars)data.cars=data.cars.map(c=>c.project===edit?{...c,project:''}:c);if(kind==='projects'&&data.carReservations)data.carReservations=data.carReservations.filter(b=>b.project!==edit);save();$('#modal').close()};$('#close').onclick=$('#cancel').onclick=()=>$('#modal').close();$('#add').onclick=()=>{if(view==='cars'){if(carsTab==='calendar')openCarReservation();else openCar();return}open(view==='plan'?'assignments':view)};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));render()});$('#search').oninput=render;$('#scale').onchange=()=>{if(monthCount()>=6){data.calendarDisplay={...displaySettings(),unit:'weeks'};save()}else render()};function move(n){if($('#scale').value==='week')cursor=new Date(+cursor+n*7*DAY);else cursor=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+n*monthCount(),1));render()}$('#prev').onclick=()=>move(-1);$('#next').onclick=()=>move(1);$('#today').onclick=()=>{cursor=dt(today);render()};
function valid(x){if(!x||!validFleet(x))return false;if(!x||!['people','projects','assignments'].every(k=>Array.isArray(x[k])&&x[k].length<=10000&&new Set(x[k].map(y=>y.id)).size===x[k].length&&x[k].every(y=>y&&typeof y.id==='string')))return false;const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+dt(s))&&iso(dt(s))===s;return x.people.every(p=>typeof p.name==='string'&&p.name.trim()&&typeof(p.role||'')==='string'&&(p.group===undefined||typeof p.group==='string'))&&x.projects.every(p=>typeof p.name==='string'&&p.name.trim()&&/^#[0-9a-f]{6}$/i.test(p.color)&&['shortName','topicNumber','description'].every(k=>p[k]===undefined||typeof p[k]==='string'))&&x.assignments.every(a=>x.people.some(p=>p.id===a.person)&&x.projects.some(p=>p.id===a.project)&&date(a.start)&&date(a.end)&&a.start<=a.end&&Number.isInteger(a.load)&&a.load>0&&a.load<=100&&typeof(a.note||'')==='string'&&(a.stage===undefined||['Offline','Uruchomienie'].includes(a.stage)))};render();updateFileStatus();
// Direct manipulation uses the original dates, even for bars clipped by the view.
let dragState=null,suppressBarClickUntil=0;
const dragInfo=document.createElement('div');dragInfo.className='drag-info';dragInfo.hidden=true;dragInfo.setAttribute('role','status');document.body.append(dragInfo);
$('#chart').addEventListener('click',e=>{if(Date.now()<suppressBarClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
$('#chart').addEventListener('pointerdown',e=>{const bar=e.target.closest('[data-edit]');if(!bar||e.button!==0||dragState)return;const assignment=data.assignments.find(a=>a.id===bar.dataset.edit);if(!assignment)return;const [start,end]=bounds(),days=(dt(end)-dt(start))/DAY+1;dragState={bar,assignment,pointer:e.pointerId,x:e.clientX,y:e.clientY,originalPerson:assignment.person,newPerson:assignment.person,validTarget:true,start,end,days,width:bar.parentElement.getBoundingClientRect().width,mode:e.target.dataset.resize||'move',originalStart:assignment.start,originalEnd:assignment.end,newStart:assignment.start,newEnd:assignment.end,moved:false};bar.setPointerCapture(e.pointerId)});
$('#chart').addEventListener('pointermove',e=>{const d=dragState;if(!d||e.pointerId!==d.pointer)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.abs(dx)<5&&(d.mode!=='move'||Math.abs(dy)<5))return;d.moved=true;e.preventDefault();let delta=Math.round(dx/(d.width/d.days));let a=d.originalStart,b=d.originalEnd;if(d.mode==='move'){a=plus(a,delta);b=plus(b,delta)}else if(d.mode==='start'){a=plus(a,delta);if(a>b)a=b}else{b=plus(b,delta);if(b<a)b=a}d.newStart=a;d.newEnd=b;const left=Math.max(0,(dt(a)-dt(d.start))/DAY),right=Math.min(d.days,(dt(b)-dt(d.start))/DAY+1);d.bar.style.left=`calc(${left/d.days*100}% + 3px)`;d.bar.style.width=`calc(${Math.max(0,right-left)/d.days*100}% - 6px)`;d.bar.classList.add('dragging');document.querySelectorAll('.drop-target').forEach(r=>r.classList.remove('drop-target'));if(d.mode==='move'){const row=[...document.querySelectorAll('[data-person-id]')].find(r=>{const rect=r.getBoundingClientRect();return e.clientY>=rect.top&&e.clientY<rect.bottom&&e.clientX>=rect.left&&e.clientX<=rect.right});d.validTarget=!!row;d.newPerson=row?.dataset.personId||d.originalPerson;if(row){row.classList.add('drop-target');const origin=d.bar.closest('[data-person-id]').getBoundingClientRect();d.bar.style.transform=`translateY(${row.getBoundingClientRect().top-origin.top}px)`}else d.bar.style.transform='';}const person=data.people.find(p=>p.id===d.newPerson);dragInfo.textContent=(d.mode==='move'?(d.validTarget?person.name+' · ':'Poza wierszem osoby — upuszczenie anuluje · '):'')+`${a} → ${b} · ${(dt(b)-dt(a))/DAY+1} dni · Esc: anuluj`;dragInfo.hidden=false;dragInfo.style.left=Math.max(8,Math.min(e.clientX+12,innerWidth-dragInfo.offsetWidth-8))+'px';dragInfo.style.top=Math.max(8,Math.min(e.clientY-48,innerHeight-dragInfo.offsetHeight-8))+'px'});
function finishDrag(cancel=false){const d=dragState;if(!d)return;dragState=null;dragInfo.hidden=true;document.querySelectorAll('.drop-target').forEach(r=>r.classList.remove('drop-target'));if(d.bar.hasPointerCapture(d.pointer))d.bar.releasePointerCapture(d.pointer);if(!d.moved)return;suppressBarClickUntil=Date.now()+500;if(!cancel&&d.validTarget&&(d.newStart!==d.originalStart||d.newEnd!==d.originalEnd||d.newPerson!==d.originalPerson)){d.assignment.person=d.newPerson;d.assignment.start=d.newStart;d.assignment.end=d.newEnd;save();toast(`Zmieniono: ${data.people.find(p=>p.id===d.newPerson).name} · ${d.newStart} – ${d.newEnd}`)}else render()}
$('#chart').addEventListener('pointerup',e=>{if(dragState?.pointer===e.pointerId)finishDrag()});$('#chart').addEventListener('pointercancel',()=>finishDrag(true));$('#chart').addEventListener('lostpointercapture',()=>finishDrag(true));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dragState){e.preventDefault();finishDrag(true)}});window.addEventListener('blur',()=>finishDrag(true));

$('#bar-label').onchange=$('#show-load').onchange=$('#calendar-unit').onchange=()=>{data.calendarDisplay={label:$('#bar-label').value,showLoad:$('#show-load').checked,unit:$('#calendar-unit').value};save()};

for(const kind of ['project','person','specialization'])$('#filter-'+kind).addEventListener('change',e=>{const input=e.target;if(!input.matches('input[data-filter-kind]'))return;const value=input.value,f=selectedFilters();f[kind]=[...$('#filter-'+kind+'-options').querySelectorAll('input:checked')].map(x=>x.value);data.calendarFilters=f;save();[...$('#filter-'+kind+'-options').querySelectorAll('input')].find(x=>x.value===value)?.focus()});
$('#filter-group').onchange=()=>{data.calendarFilters={...selectedFilters(),group:$('#filter-group').value};save()};
document.querySelectorAll('[data-clear-filter]').forEach(button=>button.onclick=()=>{const f=selectedFilters();f[button.dataset.clearFilter]=[];data.calendarFilters=f;save()});
document.addEventListener('click',e=>{document.querySelectorAll('.multi-filter details[open]').forEach(d=>{if(!d.contains(e.target))d.open=false})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.multi-filter details[open]').forEach(d=>{d.open=false;d.querySelector('summary').focus()})});
$('#reset-filters').onclick=()=>{data.calendarFilters={};$('#search').value='';save()};
// Draw a new assignment on an empty part of a person's calendar row.
let drawState=null;
function drawDay(d,x){const r=d.track.getBoundingClientRect();return Math.max(0,Math.min(d.days-1,Math.floor((x-r.left)/r.width*d.days)))}
function paintNewRange(d){const first=Math.min(d.anchor,d.last),last=Math.max(d.anchor,d.last);d.preview.style.left=`calc(${first/d.days*100}% + 3px)`;d.preview.style.width=`calc(${(last-first+1)/d.days*100}% - 6px)`;d.preview.textContent='＋';d.start=plus(d.period,first);d.end=plus(d.period,last);dragInfo.textContent=`${d.name} · ${d.start} → ${d.end} · ${last-first+1} dni · Esc: anuluj`;dragInfo.hidden=false;dragInfo.style.left=Math.max(8,Math.min(d.x+12,innerWidth-dragInfo.offsetWidth-8))+'px';dragInfo.style.top=Math.max(8,Math.min(d.y-48,innerHeight-dragInfo.offsetHeight-8))+'px'}
$('#chart').addEventListener('pointerdown',e=>{if(e.button!==0||dragState||drawState||e.target.closest('[data-edit]'))return;const track=e.target.closest('.track');if(!track)return;if(!data.projects.length){toast('Najpierw dodaj projekt w zakładce Projekty.');return}const person=track.closest('[data-person-id]').dataset.personId,[start,end]=bounds(),days=(dt(end)-dt(start))/DAY+1;const preview=document.createElement('div');preview.className='new-assignment-preview';preview.setAttribute('aria-hidden','true');preview.style.top=Math.max(3,Math.min(e.clientY-track.getBoundingClientRect().top-12,track.clientHeight-27))+'px';track.append(preview);const d={track,preview,person,name:data.people.find(p=>p.id===person).name,pointer:e.pointerId,period:start,days,x:e.clientX,y:e.clientY};d.anchor=d.last=drawDay(d,e.clientX);drawState=d;e.preventDefault();track.setPointerCapture(e.pointerId);paintNewRange(d)});
$('#chart').addEventListener('pointermove',e=>{const d=drawState;if(!d||d.pointer!==e.pointerId)return;e.preventDefault();d.last=drawDay(d,e.clientX);d.x=e.clientX;d.y=e.clientY;paintNewRange(d)});
function finishNewRange(cancel=false){const d=drawState;if(!d)return;drawState=null;dragInfo.hidden=true;d.preview.remove();if(d.track.hasPointerCapture(d.pointer))d.track.releasePointerCapture(d.pointer);suppressBarClickUntil=Date.now()+500;if(!cancel)open('assignments',null,{person:d.person,project:selectedFilters().project[0]||data.projects[0]?.id,start:d.start,end:d.end,load:100})}
$('#chart').addEventListener('pointerup',e=>{if(drawState?.pointer===e.pointerId)finishNewRange()});$('#chart').addEventListener('pointercancel',()=>finishNewRange(true));$('#chart').addEventListener('lostpointercapture',()=>finishNewRange(true));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawState){e.preventDefault();finishNewRange(true)}});window.addEventListener('blur',()=>finishNewRange(true));
const planFileTypes=[{description:'Plan zespołu (JSON)',accept:{'application/json':['.json']}}];
function legacyCleared(){try{localStorage.removeItem(key)}catch{}recovered=false}
async function readPlanFile(file,handle=null){if(file.size>5000000)throw Error('Plik przekracza 5 MB.');const next=JSON.parse(await file.text());if(!valid(next))throw Error('Nieprawidłowy plik planu.');if(isDirty()&&!confirm('Masz niezapisane zmiany. Otworzyć plik i odrzucić te zmiany?'))return;data=normalizeBookingDrivers(ensureReservationProject(normalizeFleetIds(next)));fileHandle=handle;fileName=file.name;savedSnapshot=JSON.stringify(data);fileNotice='';recovered=false;$('#search').value='';render();toast('Otwarto: '+file.name)}
async function desktopApi(){if(!window.pywebview?.api)throw Error('Program jeszcze się uruchamia. Spróbuj ponownie.');return window.pywebview.api}
async function openPlan(){if(fileBusy)return;fileBusy=true;updateFileStatus();try{const api=await desktopApi(),file=await api.open_plan();if(!file)return;const next=JSON.parse(file.text);if(!valid(next))throw Error('Nieprawidłowy plik planu.');if(isDirty()&&!confirm('Odrzucić niezapisane zmiany i otworzyć wybrany plik?'))return;await api.accept_open(file.token);data=normalizeBookingDrivers(ensureReservationProject(normalizeFleetIds(next)));$('#disk-format').value=file.format||'xlsx';fileName=file.name;filePath=file.path||file.name;savedSnapshot=JSON.stringify(data);fileNotice='';$('#search').value='';render();toast('Otwarto: '+fileName)}catch(e){fileNotice='Nie otwarto pliku: '+e.message;toast(fileNotice)}finally{fileBusy=false;updateFileStatus()}}
async function savePlan(asNew=false){if(fileBusy)return;fileBusy=true;fileNotice='';updateFileStatus();const snapshot=JSON.stringify(data);try{const api=await desktopApi(),result=await api.save_plan(JSON.stringify(JSON.parse(snapshot),null,2),asNew,$('#disk-format').value);if(!result)return;fileName=result.name;filePath=result.path||result.name;savedSnapshot=snapshot;fileNotice=result.warning||'';toast('Zapisano: '+fileName)}catch(e){fileNotice='Zapis nie powiódł się: '+e.message;toast(fileNotice)}finally{fileBusy=false;updateFileStatus()}}
$('#import').onclick=openPlan;$('#export').onclick=()=>savePlan();$('#save-as').onclick=()=>savePlan(true);
$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;fileBusy=true;updateFileStatus();try{await readPlanFile(file)}catch{fileNotice='Nieprawidłowy plik — bieżący plan pozostał bez zmian.';toast(fileNotice)}finally{e.target.value='';fileBusy=false;updateFileStatus()}};
// Native host checks dirty state before closing the window.
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!$('#modal').open&&!$('#split-dialog').open&&!$('#car-modal').open)savePlan(e.shiftKey);else toast('Najpierw zastosuj zmiany w formularzu.')}});

// Update checks are independent of file operations and never change the plan.
async function showAppVersion(){try{const api=await desktopApi();$('#app-version').textContent='Wersja '+await api.get_version()}catch{}}
window.addEventListener('pywebviewready',showAppVersion);
if(window.pywebview?.api)showAppVersion();
$('#check-updates').onclick=async()=>{
 const button=$('#check-updates'),status=$('#update-status'),download=$('#download-update');
 button.disabled=true;download.hidden=true;status.textContent='Sprawdzanie aktualizacji…';
 try{
  const api=await desktopApi(),result=await api.check_updates();
  if(result.current)$('#app-version').textContent='Wersja '+result.current;
  if(result.status==='available'){
   status.textContent='Dostępna wersja '+result.latest+'. Kliknij „Zainstaluj i uruchom ponownie”.';
   download.hidden=false;
  }else if(result.status==='current')status.textContent='Masz aktualną wersję ('+result.current+').';
  else if(result.status==='pending')status.textContent='Wersja '+result.latest+' nie ma jeszcze gotowej paczki Windows. Spróbuj później.';
  else if(result.status==='unavailable')status.textContent='Nie opublikowano jeszcze stabilnego wydania w GitHub Releases.';
  else status.textContent=result.message||'Nie udało się sprawdzić aktualizacji.';
 }catch(e){status.textContent='Nie udało się sprawdzić aktualizacji. '+e.message}
 finally{button.disabled=false}
};
let installingUpdate=false;
$('#download-update').onclick=async()=>{
 if(installingUpdate||fileBusy)return;
 if($('#modal').open||$('#split-dialog').open||$('#car-modal').open){toast('Najpierw zastosuj zmiany w formularzu.');return}
 if(!confirm('Pobrać aktualizację i ponownie uruchomić program? Niezapisane zmiany zostaną najpierw zapisane.'))return;
 installingUpdate=true;
 try{
  if(isDirty()){await savePlan();if(isDirty())throw Error('Nie zapisano zmian. Aktualizacja została wstrzymana.')}
  fileBusy=true;updateFileStatus();$('main').inert=true;$('aside').inert=true;
  $('#update-status').textContent='Pobieranie i sprawdzanie aktualizacji…';
  const api=await desktopApi();await api.prepare_update();
  $('#update-status').textContent='Aktualizacja gotowa. Potwierdź zamknięcie programu, jeśli pojawi się pytanie.';
  await api.install_update();
 }catch(e){$('#update-status').textContent='Nie zainstalowano aktualizacji: '+e.message}
 finally{installingUpdate=false;fileBusy=false;$('main').inert=false;$('aside').inert=false;updateFileStatus()}
};
let startupUpdateCheck=false;
function checkUpdatesOnStartup(){if(startupUpdateCheck)return;startupUpdateCheck=true;setTimeout(()=>$('#check-updates').click(),2500)}
window.addEventListener('pywebviewready',checkUpdatesOnStartup);
if(window.pywebview?.api)checkUpdatesOnStartup();


$('#copy-assignment').onclick=()=>{
 if(kind!=='assignments'||!edit)return;
 if(!$('#form').reportValidity())return;
 const source=data.assignments.find(a=>a.id===edit);
 if(!source)return;
 const values=Object.fromEntries(new FormData($('#form')));
 if(values.end<values.start){$('#form-error').textContent='Sprawdź daty przypisania.';return}
 // Only the new copies receive the current form values; the source is unchanged.
 $('#modal').close();
 open('assignments',null,{...values,people:[],copyFrom:source.person});
};

let splitSource=null,splitFromEditor=false;
function showSplit(source,preferredDate=null,fromEditor=false){
 if(source.start>=source.end){toast('Zadania jednodniowego nie można podzielić.');return}
 splitSource={...source};splitFromEditor=fromEditor;
 const input=$('#split-date'),min=plus(source.start,1);
 input.min=min;input.max=source.end;
 input.value=preferredDate? (preferredDate<min?min:preferredDate>source.end?source.end:preferredDate):plus(source.start,Math.ceil((dt(source.end)-dt(source.start))/DAY/2));
 $('#split-error').textContent='';updateSplitPreview();$('#split-dialog').showModal();input.focus();
}
function updateSplitPreview(){
 if(!splitSource)return;
 try{const parts=splitAssignment(splitSource,$('#split-date').value,()=> 'preview');
 $('#split-preview').textContent=parts.map((a,i)=>(i+1)+'. część: '+a.start+' – '+a.end).join(' | ');
 }catch{$('#split-preview').textContent='Wybierz datę wewnątrz zadania.'}
}
$('#split-date').oninput=updateSplitPreview;
$('#cancel-split').onclick=()=>$('#split-dialog').close();
$('#split-dialog').addEventListener('close',()=>{splitSource=null});
$('#split-assignment').onclick=()=>{
 if(kind!=='assignments'||!edit||!$('#form').reportValidity())return;
 const source=data.assignments.find(a=>a.id===edit);if(!source)return;
 const values=Object.fromEntries(new FormData($('#form')));
 if(values.end<values.start){$('#form-error').textContent='Sprawdź daty przypisania.';return}
 showSplit({...source,...values,load:Number(values.load)},null,true);
};
$('#split-form').onsubmit=e=>{
 e.preventDefault();
 try{
  const index=data.assignments.findIndex(a=>a.id===splitSource?.id);
  if(index<0)throw Error('Przypisanie już nie istnieje.');
  if(data.assignments.length>=10000)throw Error('Plan może zawierać maksymalnie 10000 przypisań.');
  const parts=splitAssignment(splitSource,$('#split-date').value,uid);
  data.assignments.splice(index,1,...parts);
  if(splitFromEditor)$('#modal').close();
  $('#split-dialog').close();save();toast('Podzielono zadanie — kliknij Zapisz, aby zapisać plik.');
 }catch(error){$('#split-error').textContent=error.message}
};
let menuAssignment=null,menuDate=null,menuBar=null;
function closeAssignmentMenu(restore=false){$('#assignment-menu').hidden=true;if(restore&&menuBar?.isConnected)menuBar.focus()}
$('#plan').addEventListener('contextmenu',e=>{
 if(dragState||drawState||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 e.preventDefault();
 const bar=e.target.closest('[data-edit]'),source=bar?data.assignments.find(a=>a.id===bar.dataset.edit):null;
 menuAssignment=source?.id||null;menuBar=bar;menuDate=null;
 $('#menu-split').hidden=$('#menu-copy').hidden=!source;
 if(source){
  const [start,end]=bounds(),rect=bar.parentElement.getBoundingClientRect(),days=(dt(end)-dt(start))/DAY+1;
  menuDate=plus(start,Math.max(0,Math.min(days-1,Math.floor((e.clientX-rect.left)/rect.width*days))));
 }
 const menu=$('#assignment-menu');menu.hidden=false;
 menu.style.left=Math.max(8,Math.min(e.clientX,innerWidth-menu.offsetWidth-8))+'px';
 menu.style.top=Math.max(8,Math.min(e.clientY,innerHeight-menu.offsetHeight-8))+'px';
 $(source?'#menu-split':'#menu-new-project').focus();
});
$('#menu-new-project').onclick=()=>{closeAssignmentMenu();open('projects',null)};
$('#menu-split').onclick=()=>{const source=data.assignments.find(a=>a.id===menuAssignment);closeAssignmentMenu();if(source)showSplit(source,menuDate)};
$('#menu-copy').onclick=()=>{const source=data.assignments.find(a=>a.id===menuAssignment);closeAssignmentMenu();if(source)open('assignments',null,{...source,people:[],copyFrom:source.person})};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#assignment-menu'))closeAssignmentMenu()});
document.addEventListener('scroll',()=>closeAssignmentMenu(),true);
window.addEventListener('resize',()=>closeAssignmentMenu());
window.addEventListener('blur',()=>closeAssignmentMenu());
$('#assignment-menu').addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();closeAssignmentMenu(true)}
 if(e.key==='Tab')closeAssignmentMenu();
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const items=[...$('#assignment-menu').querySelectorAll('[role=menuitem]')].filter(item=>!item.hidden),index=items.indexOf(document.activeElement);items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}
});
function paletteColor(index,offset=0){
 const h=((index*137.508+offset)%360)/60,s=.58,l=.38,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;
 const rgb=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];
 return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
let paletteOffset=0;
$('#generate-colors').onclick=()=>{
 if(view!=='projects'||!data.projects.some(p=>!isReservationProject(p.id)))return;
 if(!confirm('Nadać nowe kolory projektom ('+data.projects.filter(p=>!isReservationProject(p.id)).length+'), z wyjątkiem stałej rezerwacji? Plik na dysku zmieni się dopiero po kliknięciu Zapisz.'))return;
 paletteOffset=(paletteOffset+37)%360;
 data.projects.filter(p=>!isReservationProject(p.id)).forEach((p,i)=>p.color=paletteColor(i,paletteOffset));
 save();toast('Wygenerowano kolory projektów — kliknij Zapisz, aby zapisać plik.');
};

const zoomScales=['week','month','twoMonths','threeMonths','sixMonths','year'];
function zoomScale(current,direction){return zoomScales[Math.max(0,Math.min(zoomScales.length-1,zoomScales.indexOf(current)+direction))]}
let lastWheelZoom=0,wheelSum=0;
$('#chart').addEventListener('wheel',e=>{
 if(!e.ctrlKey){wheelSum=0;return}
 if(e.shiftKey||dragState||drawState||$('#modal').open||$('#split-dialog').open||!e.target.closest('.track,.days,.month-segments'))return;
 if(Math.abs(e.deltaX)>Math.abs(e.deltaY)||!e.deltaY)return;
 e.preventDefault();
 const now=Date.now();if(now-lastWheelZoom<200)return;
 wheelSum+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?200:1);
 if(Math.abs(wheelSum)<40)return;
 const current=$('#scale').value,next=zoomScale(current,wheelSum>0?1:-1);
 wheelSum=0;if(next===current)return;
 const target=e.target.closest('.track,.days,.month-segments'),rect=target.getBoundingClientRect(),[start,end]=bounds(),days=(dt(end)-dt(start))/DAY+1;
 const day=plus(start,Math.max(0,Math.min(days-1,Math.floor((e.clientX-rect.left)/rect.width*days))));
 cursor=dt(day);$('#scale').value=next;
 data.calendarDisplay={...displaySettings(),unit:['sixMonths','year'].includes(next)?'weeks':'days'};
 lastWheelZoom=now;closeAssignmentMenu();save();
},{passive:false});

