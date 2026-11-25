// Nieobecności z wiadomości e-mail: rozpoznanie zdania, dobór osoby i projektu, odczyt .msg / .eml.
// Wzorzec: „Dla pracownika Jan Nowak wprowadzono w okresie 2026-11-25 - 2026-11-27 nieobecność zwolnienie chorobowe.”
const ABSENCE_TOPIC='00-0001';

function absenceNormalize(s){
 return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ł/g,'l').replace(/Ł/g,'L').toLowerCase().replace(/\s+/g,' ').trim();
}
function absenceNameKey(s){return absenceNormalize(s).split(' ').filter(Boolean).sort().join(' ')}

// Usuwa znaczniki HTML i encje, aby zdanie dało się znaleźć także w treści HTML.
function absenceCleanText(text){
 let s=String(text||'');
 if(/<\/?[a-z][^>]*>/i.test(s)){
  s=s.replace(/<(style|script)[\s\S]*?<\/\1>/gi,' ').replace(/<br\s*\/?>|<\/(p|div|tr|li)>/gi,'\n').replace(/<[^>]+>/g,' ');
  s=s.replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi,(m,n)=>String.fromCharCode(parseInt(n,16)));
 }
 return s.replace(/[ ​]/g,' ').replace(/\s+/g,' ').trim();
}

function absenceDate(s){
 let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
 let y,mo,d;
 if(m){y=+m[1];mo=+m[2];d=+m[3]}
 else{m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);if(!m)return null;d=+m[1];mo=+m[2];y=+m[3]}
 const iso=String(y).padStart(4,'0')+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 const t=new Date(iso+'T00:00:00Z');
 return Number.isFinite(+t)&&t.toISOString().slice(0,10)===iso?iso:null;
}

// Zwraca {items:[{name,start,end,type}], errors:[tekst]} dla wszystkich zdań znalezionych w tekstach.
function parseAbsences(texts){
 const list=Array.isArray(texts)?texts:[texts],items=[],errors=[],seen=new Set();
 const D='(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\.\\d{1,2}\\.\\d{4})';
 for(const raw of list){
  const text=absenceCleanText(raw);
  const re=new RegExp('Dla\\s+pracownika\\s+(.+?)\\s+wprowadzono\\s+w\\s+okresie\\s+'+D+'\\s*[-–—]\\s*'+D+'\\s+nieobecno\\S*\\s*:?\\s+(.+?)(?=\\s*\\.(?:\\s|$)|\\s+Dla\\s+pracownika|$)','gi');
  let m;
  while((m=re.exec(text))){
   const name=m[1].trim(),start=absenceDate(m[2]),end=absenceDate(m[3]);
   let type=m[4].trim().replace(/[\s.]+$/,'');
   if(!start||!end||end<start){errors.push('Nieprawidłowy okres dla pracownika '+name+': '+m[2]+' – '+m[3]+'.');continue}
   if(name.length>80||!type){errors.push('Nie udało się odczytać zdania o nieobecności pracownika '+name+'.');continue}
   type=type.slice(0,200);
   const key=[absenceNameKey(name),start,end,absenceNormalize(type)].join('|');
   if(seen.has(key))continue;
   seen.add(key);items.push({name,start,end,type});
  }
 }
 return {items,errors};
}

// „Jan Nowak” z maila pasuje do „Nowak Jan” z planu (kolejność słów nie ma znaczenia).
function findAbsencePerson(people,name){
 const key=absenceNameKey(name),words=key.split(' ');
 let hit=people.filter(p=>absenceNameKey(p.name)===key);
 if(hit.length===0){
  hit=people.filter(p=>{const w=absenceNameKey(p.name).split(' ');return words.every(x=>w.includes(x))||w.every(x=>words.includes(x))});
 }
 if(hit.length===1)return {person:hit[0]};
 return {error:hit.length?'wiele':'brak',matches:hit};
}

function findAbsenceProject(projects){
 return projects.find(p=>String(p.topicNumber||'').trim()===ABSENCE_TOPIC)||null;
}

function absenceNote(type){
 const t=String(type||'').trim();
 return (t.charAt(0).toUpperCase()+t.slice(1)).slice(0,250);
}

// Dodaje przypisania do planu. Zwraca {added:[], skipped:[], problems:[]}.
function applyAbsences(plan,items,newId){
 const result={added:[],skipped:[],problems:[]};
 const project=findAbsenceProject(plan.projects||[]);
 if(!project){result.problems.push('W projektach nie ma tematu '+ABSENCE_TOPIC+'. Dodaj taki projekt (Nr tematu '+ABSENCE_TOPIC+') i spróbuj ponownie.');return result}
 for(const item of items){
  const found=findAbsencePerson(plan.people||[],item.name);
  if(found.error==='brak'){result.problems.push('Nie znaleziono osoby „'+item.name+'” w planie.');continue}
  if(found.error){result.problems.push('Nazwa „'+item.name+'” pasuje do kilku osób: '+found.matches.map(p=>p.name).join(', ')+'.');continue}
  const note=absenceNote(item.type),person=found.person;
  const duplicate=(plan.assignments||[]).some(a=>a.person===person.id&&a.project===project.id&&a.start===item.start&&a.end===item.end&&(a.note||'')===note);
  if(duplicate){result.skipped.push({person:person.name,start:item.start,end:item.end,note});continue}
  const assignment={id:newId(),person:person.id,project:project.id,start:item.start,end:item.end,load:100,note,stage:'Offline'};
  plan.assignments.push(assignment);
  result.added.push({person:person.name,start:item.start,end:item.end,note});
 }
 return result;
}

/* ---------- odczyt plików wiadomości ---------- */

function absenceDecode(bytes,charset){
 const tryDecode=(label,fatal)=>{try{return new TextDecoder(label,{fatal}).decode(bytes)}catch(e){return null}};
 if(charset){const s=tryDecode(charset,false);if(s!=null)return s}
 return tryDecode('utf-8',true)??tryDecode('windows-1250',false)??'';
}

// Minimalny czytnik pliku złożonego (CFB) — wystarcza do strumieni treści w plikach .msg Outlooka.
function readCfbStreams(buffer){
 const u=new Uint8Array(buffer),dv=new DataView(buffer);
 const sig=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
 if(u.length<512||sig.some((b,i)=>u[i]!==b))throw Error('To nie jest plik .msg.');
 const ssz=1<<dv.getUint16(30,true),msz=1<<dv.getUint16(32,true);
 const dirStart=dv.getUint32(48,true),miniCut=dv.getUint32(56,true),miniFatStart=dv.getUint32(60,true),difStart=dv.getUint32(68,true),nDif=dv.getUint32(72,true);
 const END=0xfffffffe,per=ssz/4,off=i=>(i+1)*ssz;
 const sector=i=>{const o=off(i);if(o+ssz>u.length)throw Error('Uszkodzony plik .msg.');return u.subarray(o,o+ssz)};
 const fatSectors=[];
 for(let i=0;i<109;i++){const v=dv.getUint32(76+i*4,true);if(v<0xfffffffa)fatSectors.push(v)}
 let dif=difStart;
 for(let n=0;n<nDif&&dif<0xfffffffa;n++){const o=off(dif);for(let i=0;i<per-1;i++){const v=dv.getUint32(o+i*4,true);if(v<0xfffffffa)fatSectors.push(v)}dif=dv.getUint32(o+(per-1)*4,true)}
 const fat=[];
 for(const s of fatSectors){const o=off(s);for(let i=0;i<per;i++)fat.push(dv.getUint32(o+i*4,true))}
 const chain=(start,table)=>{const out=[];let s=start,guard=0;while(s<0xfffffffa&&guard++<1e6){out.push(s);s=table[s]}return out};
 const readChain=start=>{const secs=chain(start,fat),out=new Uint8Array(secs.length*ssz);secs.forEach((s,i)=>out.set(sector(s),i*ssz));return out};
 const dir=readChain(dirStart),ddv=new DataView(dir.buffer,dir.byteOffset,dir.byteLength);
 const entries=[];
 for(let i=0;i+128<=dir.length;i+=128){
  const type=dir[i+66];if(!type)continue;
  const len=Math.max(0,ddv.getUint16(i+64,true)-2);let name='';
  for(let k=0;k<len;k+=2)name+=String.fromCharCode(ddv.getUint16(i+k,true));
  entries.push({name,type,start:ddv.getUint32(i+116,true),size:ddv.getUint32(i+120,true)});
 }
 const root=entries.find(e=>e.type===5);
 let mini=new Uint8Array(0),miniFat=[];
 if(root&&root.start<0xfffffffa){mini=readChain(root.start).subarray(0,root.size)}
 if(miniFatStart<0xfffffffa){const mf=readChain(miniFatStart),mdv=new DataView(mf.buffer,mf.byteOffset,mf.byteLength);for(let i=0;i+4<=mf.length;i+=4)miniFat.push(mdv.getUint32(i,true))}
 const streamData=e=>{
  if(e.size<miniCut){
   const secs=chain(e.start,miniFat),out=new Uint8Array(secs.length*msz);
   secs.forEach((s,i)=>out.set(mini.subarray(s*msz,s*msz+msz),i*msz));
   return out.subarray(0,e.size);
  }
  return readChain(e.start).subarray(0,e.size);
 };
 return entries.filter(e=>e.type===2).map(e=>({name:e.name,data:()=>streamData(e)}));
}

// Teksty z pliku .msg: treść (zwykła i HTML) oraz temat.
function msgTexts(buffer){
 const wanted=/^__substg1\.0_(1000|1013|0037)(001F|001E|0102)$/i,out=[];
 for(const s of readCfbStreams(buffer)){
  const m=wanted.exec(s.name);if(!m)continue;
  const bytes=s.data();
  out.push(m[2].toUpperCase()==='001F'?new TextDecoder('utf-16le').decode(bytes):absenceDecode(bytes));
 }
 return out;
}

function mimeBytes(str){const b=new Uint8Array(str.length);for(let i=0;i<str.length;i++)b[i]=str.charCodeAt(i)&255;return b}
function mimeDecodeQp(str){
 const s=str.replace(/=\r?\n/g,''),out=[];
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='='&&/^[0-9A-Fa-f]{2}$/.test(s.substr(i+1,2))){out.push(parseInt(s.substr(i+1,2),16));i+=2}
  else out.push(s.charCodeAt(i)&255);
 }
 return new Uint8Array(out);
}
// Teksty z pliku .eml (MIME): części text/plain i text/html, z obsługą quoted-printable i base64.
function emlTexts(raw){
 const out=[];
 const walk=part=>{
  const cut=part.search(/\r?\n\r?\n/);if(cut<0)return;
  const head=part.slice(0,cut).replace(/\r?\n[ \t]+/g,' '),body=part.slice(cut).replace(/^\r?\n\r?\n/,'');
  const header=n=>{const m=new RegExp('^'+n+':\\s*(.+)$','im').exec(head);return m?m[1]:''};
  const type=header('Content-Type'),lower=type.toLowerCase();
  const boundary=/boundary="?([^";\s]+)"?/i.exec(type);
  if(/^multipart\//.test(lower)&&boundary){
   const sep='--'+boundary[1];
   body.split(sep).slice(1).forEach(p=>{if(!p.startsWith('--'))walk(p.replace(/^\r?\n/,''))});
   return;
  }
  if(lower&&!/^text\/(plain|html)/.test(lower))return;
  const enc=header('Content-Transfer-Encoding').trim().toLowerCase(),charset=(/charset="?([^";\s]+)"?/i.exec(type)||[])[1];
  let bytes;
  if(enc==='quoted-printable')bytes=mimeDecodeQp(body);
  else if(enc==='base64'){try{bytes=mimeBytes(atob(body.replace(/\s+/g,'')))}catch(e){return}}
  else bytes=mimeBytes(body);
  out.push(absenceDecode(bytes,charset));
 };
 walk(raw);
 return out;
}

if(typeof module!=='undefined')module.exports={ABSENCE_TOPIC,absenceNormalize,absenceNameKey,absenceCleanText,parseAbsences,findAbsencePerson,findAbsenceProject,absenceNote,applyAbsences,readCfbStreams,msgTexts,emlTexts};
