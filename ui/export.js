// Eksport wybranego fragmentu harmonogramu do osobnego pliku Excel (zakres dat + projekty / osoby / grupa).

function exportValidDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s}
function exportSurnameKey(p){const w=String(p.name||'').trim().split(/\s+/);return [w[0]||'',w.slice(1).join(' ')]}

// Wybór danych do eksportu. opts: {start,end,projects:[id],persons:[id],group:'',layout,includeFree}
// Puste listy oznaczają „bez ograniczenia”. Zwraca {payload,peopleCount,taskCount} albo {error}.
function buildScheduleExport(plan,opts){
 const {start,end}=opts;
 if(!exportValidDate(start)||!exportValidDate(end))return {error:'Wybierz poprawne daty.'};
 if(end<start)return {error:'Data „do” nie może być wcześniejsza niż „od”.'};
 if((new Date(end+'T00:00:00Z')-new Date(start+'T00:00:00Z'))/86400000+1>366)return {error:'Wybierz okres nie dłuższy niż 366 dni.'};
 const projects=opts.projects||[],persons=opts.persons||[],group=opts.group||'';
 const groupOf=p=>(p.group||'').trim().toLocaleLowerCase('pl');
 const inGroup=p=>!group||(group==='__none__'?!groupOf(p):group==='group:'+groupOf(p));
 const candidates=plan.people.filter(p=>(!persons.length||persons.includes(p.id))&&inGroup(p));
 const ids=new Set(candidates.map(p=>p.id));
 const tasks=plan.assignments.filter(a=>ids.has(a.person)&&a.end>=start&&a.start<=end&&(!projects.length||projects.includes(a.project)));
 const withTasks=new Set(tasks.map(a=>a.person));
 const showFree=!!opts.includeFree&&(persons.length>0||!!group);
 const people=candidates.filter(p=>showFree||withTasks.has(p.id))
  .sort((a,b)=>{const x=exportSurnameKey(a),y=exportSurnameKey(b);return x[0].localeCompare(y[0],'pl')||x[1].localeCompare(y[1],'pl')});
 if(!people.length)return {error:'Dla tego wyboru nie ma osób ani zadań w wybranym okresie.',peopleCount:0,taskCount:0};
 const personIds=new Set(people.map(p=>p.id)),usedTasks=tasks.filter(a=>personIds.has(a.person));
 const usedProjects=new Set(usedTasks.map(a=>a.project));
 const label=p=>[p.topicNumber,p.shortName,p.name].filter(Boolean).join(' · ');
 const groupLabel=!group?'':group==='__none__'?'Bez grupy':(plan.people.find(p=>'group:'+groupOf(p)===group)?.group||'').trim();
 const names=(list,items)=>list.map(id=>items.find(x=>x.id===id)).filter(Boolean);
 return {peopleCount:people.length,taskCount:usedTasks.length,payload:{
  start,end,layout:opts.layout==='weeks'?'weeks':'days',
  filters:{projects:names(projects,plan.projects).map(label).join(', '),persons:names(persons,plan.people).map(p=>p.name).join(', '),group:groupLabel},
  people:people.map(p=>({id:p.id,name:p.name||'',group:(p.group||'').trim(),role:(p.role||'').trim()})),
  projects:plan.projects.filter(p=>usedProjects.has(p.id)).map(p=>({id:p.id,name:p.name||'',shortName:p.shortName||'',topicNumber:p.topicNumber||'',color:p.color||''})),
  assignments:usedTasks.map(a=>({person:a.person,project:a.project,start:a.start,end:a.end,load:Number(a.load),stage:a.stage||'Offline',note:a.note||''}))}};
}

if(typeof module!=='undefined')module.exports={buildScheduleExport};

if(typeof document!=='undefined')(function(){
 const button=document.getElementById('export-schedule');
 if(!button)return;
 let dialog=null;
 function build(){
  const d=document.createElement('dialog');d.id='export-dialog';d.setAttribute('aria-labelledby','export-title');
  d.innerHTML=`<form method="dialog" id="export-form"><div class="modal-head"><h2 id="export-title">Eksport harmonogramu do Excela</h2><button type="button" class="export-close" aria-label="Zamknij">×</button></div>
  <p class="export-help">Tworzy osobny plik Excel z wybranym fragmentem harmonogramu. Plan w programie nie jest zmieniany. Puste listy oznaczają brak ograniczenia.</p>
  <div class="export-grid">
   <label>Od<input type="date" id="ex-start" required></label>
   <label>Do (włącznie)<input type="date" id="ex-end" required></label>
   <label>Układ kolumn<select id="ex-layout"><option value="days">Dni</option><option value="weeks">Tygodnie</option></select></label>
   <label>Grupa osób<select id="ex-group"></select></label>
  </div>
  <div class="export-lists">
   <fieldset><legend>Projekty <button type="button" data-clear="projects">wyczyść</button></legend><div id="ex-projects" class="export-options"></div></fieldset>
   <fieldset><legend>Osoby <button type="button" data-clear="persons">wyczyść</button></legend><div id="ex-persons" class="export-options"></div></fieldset>
  </div>
  <label class="check-label export-free"><input type="checkbox" id="ex-free" checked> Pokaż wybrane osoby lub grupę także wtedy, gdy nie mają zadań w okresie</label>
  <p id="ex-summary" role="status"></p><p id="ex-error" role="alert"></p>
  <div class="modal-actions"><button type="button" id="ex-cancel">Anuluj</button><button type="submit" class="primary" id="ex-run">Eksportuj do Excela</button></div></form>`;
  document.body.appendChild(d);
  const $e=s=>d.querySelector(s);
  d.querySelector('.export-close').onclick=$e('#ex-cancel').onclick=()=>d.close();
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  d.addEventListener('change',refresh);
  d.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{d.querySelectorAll('#ex-'+b.dataset.clear+' input').forEach(i=>i.checked=false);refresh()});
  $e('#ex-start').addEventListener('input',refresh);$e('#ex-end').addEventListener('input',refresh);
  $e('#export-form').onsubmit=run;
  return d;
 }
 const checked=id=>[...dialog.querySelectorAll('#'+id+' input:checked')].map(i=>i.value);
 function options(){
  const get=s=>dialog.querySelector(s);
  return {start:get('#ex-start').value,end:get('#ex-end').value,layout:get('#ex-layout').value,group:get('#ex-group').value,
   projects:checked('ex-projects'),persons:checked('ex-persons'),includeFree:get('#ex-free').checked};
 }
 function refresh(){
  const r=buildScheduleExport(data,options()),summary=dialog.querySelector('#ex-summary'),error=dialog.querySelector('#ex-error');
  dialog.querySelector('#ex-run').disabled=!!r.error;
  error.textContent=r.error||'';
  summary.textContent=r.error?'':'Do pliku trafi: osób — '+r.peopleCount+', zadań w okresie — '+r.taskCount+'.';
 }
 async function run(e){
  e.preventDefault();
  const r=buildScheduleExport(data,options());
  if(r.error)return;
  const btn=dialog.querySelector('#ex-run');btn.disabled=true;
  try{
   const api=await desktopApi(),saved=await api.export_schedule(r.payload);
   if(saved){dialog.close();toast('Zapisano plik Excel: '+saved.name)}
  }catch(err){dialog.querySelector('#ex-error').textContent=String(err&&err.message||err)}
  finally{btn.disabled=false}
 }
 function open(){
  if(!dialog)dialog=build();
  const [start,end]=bounds(),f=selectedFilters(),get=s=>dialog.querySelector(s);
  get('#ex-start').value=start;get('#ex-end').value=end;
  const days=(new Date(end+'T00:00:00Z')-new Date(start+'T00:00:00Z'))/86400000+1;
  get('#ex-layout').value=days>62?'weeks':'days';
  const label=p=>[p.topicNumber,p.shortName,p.name].filter(Boolean).join(' · ');
  get('#ex-projects').innerHTML=sortedProjects(data.projects).map(p=>`<label><input type="checkbox" value="${esc(p.id)}" ${f.project.includes(p.id)?'checked':''}><span>${esc(label(p))}</span></label>`).join('')||'<small>Brak projektów.</small>';
  get('#ex-persons').innerHTML=sortedPeople(data.people).map(p=>`<label><input type="checkbox" value="${esc(p.id)}" ${f.person.includes(p.id)?'checked':''}><span>${esc(p.name)}</span></label>`).join('')||'<small>Brak osób.</small>';
  const groups=[['','Wszystkie grupy'],['__none__','Bez grupy'],...groupList().map(([k,n])=>['group:'+k,n])];
  get('#ex-group').innerHTML=groups.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
  get('#ex-group').value=groups.some(([v])=>v===f.group)?f.group:'';
  refresh();
  if(!dialog.open)dialog.showModal();
 }
 button.onclick=open;
 window.openScheduleExport=open;
})();
