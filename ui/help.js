// „Jak używać” — okno pomocy z opisem funkcji i ilustracjami (SVG rysowane w kodzie, bez plików obrazów).
(function(){
const C={g:'#347c68',b:'#587fba',p:'#9171b0',a:'#bb8a40',x:'#788391'};
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};

/* ---------- elementy rysunków ---------- */
function svg(w,h,inner,label){return `<figure class="help-fig" style="max-width:${Math.min(w,640)}px"><svg class="ill" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg><figcaption>${label}</figcaption></figure>`}
function badge(n,x,y){return `<g class="s-badge"><circle cx="${x}" cy="${y}" r="10"/><text x="${x}" y="${y+4}" text-anchor="middle">${n}</text></g>`}
function cursor(x,y){return `<path class="s-cursor" transform="translate(${x} ${y})" d="M0 0 L0 17 L4.5 13 L7.5 20 L10 19 L7 12 L13 12 Z"/>`}
function arrow(x1,y1,x2,y2){return `<line class="s-arrow" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#h-arrow)"/>`}
function note(x,y,w,t){return `<g><rect class="s-note" x="${x}" y="${y}" width="${w}" height="22" rx="5"/><text class="s-txt" x="${x+8}" y="${y+15}">${t}</text></g>`}
function btn(x,y,w,t,primary){return `<g><rect class="${primary?'s-primary':'s-btn'}" x="${x}" y="${y}" width="${w}" height="26" rx="6"/><text class="${primary?'s-wh':'s-txt'}" x="${x+w/2}" y="${y+17}" text-anchor="middle">${t}</text></g>`}

/* Oś czasu: wiersze osób z paskami. Zwraca SVG oraz geometrię do nakładania opisów. */
function chart(o){
  const W=640,nameW=104,days=o.days||14,dw=(W-nameW)/days,hh=24,rh=34,rows=o.rows,H=hh+rows.length*rh+6+(o.extra||0),first=o.first||1,wk=o.weekends||[5,6,12,13];
  let s=`<rect class="s-panel" x=".5" y=".5" width="${W-1}" height="${H-1}" rx="8"/>`;
  wk.forEach(i=>{s+=`<rect class="s-wk" x="${nameW+i*dw}" y="${hh}" width="${dw}" height="${H-hh-1}"/>`});
  for(let i=0;i<days;i++)s+=`<text class="s-mut" x="${nameW+i*dw+dw/2}" y="16" text-anchor="middle">${first+i}</text>`;
  s+=`<line class="s-line" x1="0" x2="${W}" y1="${hh}" y2="${hh}"/>`;
  rows.forEach((r,i)=>{const y=hh+i*rh;
    if(i)s+=`<line class="s-line" x1="0" x2="${W}" y1="${y}" y2="${y}"/>`;
    if(r.over)s+=`<rect class="s-over" x="1" y="${y+.5}" width="${W-2}" height="${rh-1}"/>`;
    s+=`<text class="s-txt b" x="12" y="${y+rh/2+4}">${r.name}</text>`;
    (r.bars||[]).forEach(b=>{const x=nameW+b.from*dw+1,w=(b.to-b.from+1)*dw-2,lane=b.lane!=null,by=lane?y+3+b.lane*15:y+7,bh=lane?13:rh-14;
      s+=`<rect x="${x}" y="${by}" width="${w}" height="${bh}" rx="4" fill="${b.c}"${b.ghost?' fill-opacity=".45" stroke="#28785a" stroke-dasharray="4 3"':''}/>`;
      if(b.hatch)s+=`<rect x="${x}" y="${by}" width="${w}" height="${bh}" rx="4" fill="url(#h-hatch)"/>`;
      if(b.t)s+=`<text class="s-wh"${lane?' style="font-size:9px"':''} x="${x+8}" y="${lane?by+10:y+rh/2+4}">${b.t}</text>`})});
  if(o.today!=null){const x=nameW+(o.today+.5)*dw;s+=`<line class="s-today" x1="${x}" x2="${x}" y1="${hh}" y2="${H-1}"/>`}
  return {s,W,H,nameW,dw,hh,rh,px:i=>nameW+i*dw,py:r=>hh+r*rh}
}
const compose=(g,extra,label)=>svg(g.W,g.H,g.s+(extra||''),label);

/* ---------- ilustracje ---------- */
const ILL={};

ILL.files=()=>svg(300,230,`
<rect class="s-side" x="0" y="0" width="300" height="230" rx="10"/>
<text class="s-sidemut" x="18" y="26">Plik: Plan_2026.xlsx</text>
<text class="s-sidemut" x="18" y="44">Plan nie jest zapisany w pliku</text>
<rect class="s-sidebtn" x="14" y="56" width="272" height="30" rx="6"/><text class="s-sidetxt" x="26" y="76">📂 Otwórz</text>
<text class="s-sidemut" x="18" y="108">Format pliku</text>
<rect class="s-sidebtn" x="14" y="114" width="272" height="30" rx="6"/><text class="s-sidetxt" x="26" y="134">Excel (.xlsx)</text>
<rect class="s-sidebtn" x="14" y="154" width="272" height="30" rx="6"/><text class="s-sidetxt" x="26" y="174">💾 Zapisz</text>
<rect class="s-sidebtn" x="14" y="190" width="272" height="30" rx="6"/><text class="s-sidetxt" x="26" y="210">💾 Zapisz jako…</text>
${badge(1,276,71)}${badge(2,276,129)}${badge(3,276,169)}${badge(4,276,205)}`,'Panel plików w lewym dolnym rogu okna');

ILL.overview=()=>{
  const g=chart({today:6,rows:[
    {name:'Kowalski Jan',bars:[{from:0,to:4,c:C.g,t:'Linia pakująca'},{from:6,to:11,c:C.b,t:'Hala 2',hatch:true}]},
    {name:'Nowak Anna',over:true,bars:[{from:1,to:8,c:C.p,t:'System wizyjny',lane:0},{from:3,to:10,c:C.a,t:'Stanowisko',lane:1}]},
    {name:'Żuk Piotr',bars:[{from:2,to:9,c:C.g,t:'Linia pakująca'}]}]});
  const e=badge(1,94,g.py(0)+17)+badge(2,g.px(2)+g.dw*2.5,g.py(0)+27)+badge(3,g.px(9)+g.dw*1.2,g.py(0)+27)+badge(4,g.px(5)+g.dw/2,g.H-12)+badge(5,g.px(6)+g.dw/2,g.py(2)+27)+badge(6,94,g.py(1)+17);
  return compose(g,e,'Harmonogram: osoby w wierszach, zadania jako paski na osi czasu');
};

ILL.create=()=>{
  const g=chart({today:3,extra:30,rows:[{name:'Kowalski Jan',bars:[{from:0,to:3,c:C.g,t:'Linia pakująca'}]},{name:'Nowak Anna',bars:[{from:7,to:10,c:C.b,t:'Hala 2'}]},{name:'Żuk Piotr',bars:[{from:4,to:8,c:C.a,ghost:true}]}]});
  const e=cursor(g.px(4)+8,g.py(2)+16)+note(g.px(4),g.py(2)+36,210,'Zaznaczony zakres: 12–16')+`<rect class="s-hl" x="1" y="${g.py(0)}" width="100" height="${g.rh}" rx="4"/>`+cursor(70,g.py(0)+22)+note(8,g.py(1)+38,176,'Klik w nazwisko → nowe zadanie');
  return compose(g,e,'Dodawanie zadania: kliknij nazwisko lub przeciągnij po pustym wierszu');
};

ILL.move=()=>{
  const g=chart({today:3,rows:[{name:'Kowalski Jan',bars:[{from:1,to:5,c:C.g,t:'Linia pakująca'}]},{name:'Nowak Anna',bars:[]},{name:'Żuk Piotr',bars:[{from:7,to:11,c:C.b,t:'Hala 2'}]}]});
  const x1=g.px(1),x2=g.px(6),y=g.py(0)+7;
  const e=`<rect class="s-handle" x="${x1}" y="${y}" width="4" height="20"/><rect class="s-handle" x="${x2-5}" y="${y}" width="4" height="20"/>`
   +arrow(x2+14,g.py(0)+17,x2+70,g.py(0)+17)+arrow(g.px(3),g.py(0)+30,g.px(3),g.py(1)+14)
   +note(x2+76,g.py(0)+6,150,'Zmiana długości')+note(g.px(3)+10,g.py(1)+6,180,'Przeniesienie na inną osobę')+badge(1,x1-12,y+10)+badge(2,g.px(3)-14,g.py(0)+34);
  return compose(g,e,'Przesuwanie paska i zmiana jego długości');
};

ILL.menu=()=>{
  const g=chart({extra:40,rows:[{name:'Kowalski Jan',bars:[{from:1,to:6,c:C.g,t:'Linia pakująca'}]},{name:'Nowak Anna',bars:[]},{name:'Żuk Piotr',bars:[]}]});
  const mx=g.px(4),my=g.py(0)+22;
  const e=`<g><rect class="s-menu" x="${mx}" y="${my}" width="190" height="94" rx="8"/>
   <text class="s-txt" x="${mx+14}" y="${my+26}">Podziel zadanie</text><text class="s-txt" x="${mx+14}" y="${my+54}">Kopiuj dla innych osób</text><text class="s-txt" x="${mx+14}" y="${my+82}">＋ Nowy projekt</text></g>`+cursor(mx-4,my-6);
  return compose(g,e,'Menu pod prawym przyciskiem myszy na pasku zadania');
};

ILL.split=()=>{
  const g1=chart({days:14,rows:[{name:'Kowalski Jan',bars:[{from:1,to:10,c:C.g,t:'Linia pakująca'}]}]});
  const g2=chart({days:14,extra:30,rows:[{name:'Kowalski Jan',bars:[{from:1,to:5,c:C.g,t:'Linia pakująca'},{from:6,to:10,c:C.g,t:'Linia pakująca'}]}]});
  const mid=g2.px(6);
  return `<div class="help-pair">${svg(g1.W,g1.H,g1.s,'Przed podziałem: jedno zadanie')}${svg(g2.W,g2.H,g2.s+`<line class="s-cut" x1="${mid}" x2="${mid}" y1="${g2.hh}" y2="${g2.H-2}"/>`+note(mid-100,g2.hh+44,200,'Druga część od wybranego dnia'),'Po podziale: dwa osobne zadania')}</div>`;
};

ILL.form=()=>svg(460,300,`
<rect class="s-panel" x=".5" y=".5" width="459" height="299" rx="10"/>
<text class="s-txt b" x="20" y="30" style="font-size:15px">Edytuj przypisanie</text>
<text class="s-mut" x="20" y="56">Osoba</text><rect class="s-input" x="20" y="62" width="200" height="26" rx="5"/><text class="s-txt" x="28" y="80">Kowalski Jan</text>
<text class="s-mut" x="240" y="56">Projekt</text><rect class="s-input" x="240" y="62" width="200" height="26" rx="5"/><text class="s-txt" x="248" y="80">Linia pakująca</text>
<text class="s-mut" x="20" y="108">Od</text><rect class="s-input" x="20" y="114" width="130" height="26" rx="5"/><text class="s-txt" x="28" y="132">2026-11-12</text>
<text class="s-mut" x="165" y="108">Do (włącznie)</text><rect class="s-input" x="165" y="114" width="130" height="26" rx="5"/><text class="s-txt" x="173" y="132">2026-11-20</text>
<text class="s-mut" x="310" y="108">Zaangażowanie (%)</text><rect class="s-input" x="310" y="114" width="130" height="26" rx="5"/><text class="s-txt" x="318" y="132">100</text>
<text class="s-mut" x="20" y="160">Etap zadania</text><rect class="s-input" x="20" y="166" width="200" height="26" rx="5"/><text class="s-txt" x="28" y="184">Uruchomienie</text>
<text class="s-mut" x="20" y="212">Notatka</text><rect class="s-input" x="20" y="218" width="420" height="26" rx="5"/>
${btn(20,260,70,'Usuń')}${btn(170,260,90,'Podziel')}${btn(268,260,76,'Anuluj')}${btn(352,260,94,'Zastosuj',true)}
${badge(1,232,75)}${badge(2,155,127)}${badge(3,300,125)}${badge(4,232,179)}`,'Formularz zadania (przypisania osoby do projektu)');

ILL.filters=()=>svg(640,150,`
<rect class="s-panel" x=".5" y=".5" width="639" height="149" rx="8"/>
<rect class="s-btn" x="14" y="14" width="30" height="26" rx="6"/><text class="s-txt" x="24" y="32">‹</text>
<text class="s-txt b" x="56" y="32" style="font-size:15px">listopad 2026</text>
<rect class="s-btn" x="168" y="14" width="30" height="26" rx="6"/><text class="s-txt" x="178" y="32">›</text>
<rect class="s-btn" x="206" y="14" width="70" height="26" rx="6"/><text class="s-txt" x="219" y="32">Dzisiaj</text>
<rect class="s-input" x="340" y="14" width="150" height="26" rx="5"/><text class="s-mut" x="348" y="32">Szukaj…</text>
<rect class="s-input" x="498" y="14" width="60" height="26" rx="5"/><text class="s-txt" x="506" y="32">Dni</text>
<rect class="s-input" x="566" y="14" width="60" height="26" rx="5"/><text class="s-txt" x="574" y="32">Miesiąc</text>
<text class="s-mut" x="14" y="68">Temat / projekt</text><rect class="s-input" x="14" y="74" width="140" height="26" rx="5"/><text class="s-txt" x="22" y="92">Wszystkie</text>
<text class="s-mut" x="166" y="68">Osoba</text><rect class="s-input" x="166" y="74" width="140" height="26" rx="5"/><text class="s-txt" x="174" y="92">Wszystkie</text>
<text class="s-mut" x="318" y="68">Specjalizacja</text><rect class="s-input" x="318" y="74" width="140" height="26" rx="5"/><text class="s-txt" x="326" y="92">PLC, Robotyk</text>
<text class="s-mut" x="470" y="68">Grupa osób</text><rect class="s-input" x="470" y="74" width="100" height="26" rx="5"/><text class="s-txt" x="478" y="92">Serwis</text>
${btn(14,112,120,'Wyczyść filtry')}<text class="s-mut" x="170" y="130">Widocznych osób: 3 z 12</text>
${badge(1,161,27)}${badge(2,330,27)}${badge(3,596,54)}${badge(4,140,62)}${badge(5,148,125)}`,'Pasek narzędzi harmonogramu: okres, wyszukiwanie, zakres i filtry');

ILL.catalog=()=>svg(640,170,`
<rect class="s-panel" x=".5" y=".5" width="639" height="169" rx="8"/>
<rect class="s-head" x="1" y="1" width="638" height="30" rx="7"/>
<text class="s-txt b" x="14" y="21">Nazwisko i imię</text><text class="s-txt b" x="250" y="21">Specjalizacja</text><text class="s-txt b" x="390" y="21">Grupa</text><text class="s-txt b" x="490" y="21">Przypisania</text>
<text class="s-txt" x="14" y="52">Adamski Piotr</text><text class="s-txt" x="250" y="52">PLC</text><text class="s-txt" x="390" y="52">Robotyk</text><text class="s-txt" x="520" y="52">4</text>${btn(560,36,68,'Edytuj')}
<rect class="s-hl" x="2" y="62" width="636" height="34" rx="4"/>
<text class="s-txt" x="14" y="84">Kowalska Ewa</text><text class="s-txt" x="250" y="84">Elektryk</text><text class="s-txt" x="390" y="84">Serwis</text><text class="s-txt" x="520" y="84">2</text>${btn(560,68,68,'Edytuj')}
<text class="s-txt" x="14" y="116">Żuk Jan</text><text class="s-txt" x="250" y="116">Software</text><text class="s-txt" x="390" y="116">Serwis</text><text class="s-txt" x="520" y="116">0</text>${btn(560,100,68,'Edytuj')}
${cursor(300,80)}${note(330,134,300,'Dwuklik na wierszu otwiera edycję')}`,'Lista osób (lista projektów działa tak samo)');

ILL.projectform=()=>svg(460,250,`
<rect class="s-panel" x=".5" y=".5" width="459" height="249" rx="10"/>
<text class="s-txt b" x="20" y="30" style="font-size:15px">Edytuj projekt</text>
<text class="s-mut" x="20" y="54">Nr tematu</text><rect class="s-input" x="20" y="60" width="120" height="26" rx="5"/><text class="s-txt" x="28" y="78">25-0142</text>
<text class="s-mut" x="156" y="54">Skrót</text><rect class="s-input" x="156" y="60" width="120" height="26" rx="5"/><text class="s-txt" x="164" y="78">LP-2</text>
<text class="s-mut" x="292" y="54">Kolor projektu</text><rect class="s-input" x="292" y="60" width="148" height="26" rx="5"/><rect x="300" y="66" width="14" height="14" rx="3" fill="${C.g}"/>
<text class="s-mut" x="20" y="108">Nazwa projektu</text><rect class="s-input" x="20" y="114" width="420" height="26" rx="5"/><text class="s-txt" x="28" y="132">Linia pakująca — modernizacja</text>
<text class="s-mut" x="20" y="160">Kraj delegacji</text><rect class="s-input" x="20" y="166" width="200" height="26" rx="5"/><text class="s-txt" x="28" y="184">Niemcy</text>
${btn(268,208,76,'Anuluj')}${btn(352,208,94,'Zastosuj',true)}
${badge(1,150,60)}${badge(2,286,60)}${badge(3,232,179)}`,'Formularz projektu');

ILL.cars=()=>{
  const g=chart({today:5,extra:28,rows:[{name:'WX 1234A',bars:[{from:1,to:4,c:C.g,t:'Linia pakująca'},{from:7,to:10,c:C.b,t:'Hala 2'}]},{name:'WX 5678B',bars:[{from:3,to:8,c:C.p,t:'Rezerwacja'}]},{name:'WX 9012C',bars:[]}]});
  const e=cursor(g.px(2)+10,g.py(2)+14)+note(g.px(2),g.py(2)+36,230,'Przeciągnij po pustym wierszu → rezerwacja')+badge(1,g.px(2)-12,g.py(2)+47)+badge(2,g.px(7)+16,g.py(0)+6);
  return compose(g,e,'Kalendarz rezerwacji samochodów');
};

ILL.report=()=>{
  const W=640,nameW=104,days=14,dw=(W-nameW)/days,rh=34,hh=24,H=hh+3*rh+6;
  const rows=[['Kowalski Jan',[[0,3,'free'],[4,8,'part'],[9,13,'full']]],['Nowak Anna',[[0,13,'free']]],['Żuk Piotr',[[0,5,'over'],[6,13,'part']]]];
  const col={free:'#bfe6cf',part:'#f4dc8f',full:'#c9d3df',over:'#f0b0a6'};
  let s=`<rect class="s-panel" x=".5" y=".5" width="${W-1}" height="${H-1}" rx="8"/>`;
  for(let i=0;i<days;i++)s+=`<text class="s-mut" x="${nameW+i*dw+dw/2}" y="16" text-anchor="middle">${i+1}</text>`;
  s+=`<line class="s-line" x1="0" x2="${W}" y1="${hh}" y2="${hh}"/>`;
  rows.forEach((r,i)=>{const y=hh+i*rh;if(i)s+=`<line class="s-line" x1="0" x2="${W}" y1="${y}" y2="${y}"/>`;
    s+=`<text class="s-txt b" x="12" y="${y+22}">${r[0]}</text>`;
    r[1].forEach(b=>{s+=`<rect x="${nameW+b[0]*dw+1}" y="${y+8}" width="${(b[1]-b[0]+1)*dw-2}" height="${rh-16}" rx="4" fill="${col[b[2]]}"/>`})});
  s+=`<rect class="s-match" x="${nameW+4*dw+1}" y="${hh+8}" width="${5*dw-2}" height="${rh-16}" rx="4"/>`;
  s+=badge(1,nameW+2*dw,hh+rh*0+4)+badge(2,nameW+6*dw,hh+4)+badge(3,nameW+11*dw,hh+4)+badge(4,nameW+3*dw,hh+2*rh+4)+badge(5,nameW+7*dw,hh+8);
  return svg(W,H,s,'Raport dostępności: kolor paska pokazuje sumaryczne obciążenie osoby');
};

ILL.delegation=()=>svg(640,150,`
<rect class="s-panel" x=".5" y=".5" width="639" height="149" rx="8"/>
<text class="s-txt b" x="14" y="26" style="font-size:15px">Dni delegacji w Niemczech</text>
<text class="s-mut" x="14" y="46">Razem: 23 dni, 2 osoby</text>
<rect class="s-head" x="14" y="56" width="612" height="26" rx="5"/><text class="s-txt b" x="24" y="73">Osoba</text><text class="s-txt b" x="260" y="73">Dni</text><text class="s-txt b" x="340" y="73">Projekty (dni)</text>
<text class="s-txt" x="24" y="100">Kowalski Jan</text><text class="s-txt" x="260" y="100">14</text><text class="s-txt" x="340" y="100">LP-2: 14</text>
<text class="s-txt" x="24" y="124">Żuk Jan</text><text class="s-txt" x="260" y="124">9</text><text class="s-txt" x="340" y="124">LP-2: 4 · Hala 2: 5</text>
${badge(1,196,42)}${badge(2,612,69)}`,'Tabela dni delegacji w raportach');

ILL.excel=()=>svg(640,200,`
<rect class="s-panel" x=".5" y=".5" width="639" height="199" rx="8"/>
<rect class="s-head" x="1" y="1" width="638" height="26" rx="7"/>
<text class="s-txt b" x="14" y="19">ID</text><text class="s-txt b" x="90" y="19">Nazwa</text><text class="s-txt b" x="280" y="19">Specjalizacja</text><text class="s-txt b" x="420" y="19">Grupa</text>
<text class="s-txt" x="14" y="50">p1</text><text class="s-txt" x="90" y="50">Adamski Piotr</text><text class="s-txt" x="280" y="50">PLC</text><text class="s-txt" x="420" y="50">Robotyk</text>
<text class="s-txt" x="14" y="76">p2</text><text class="s-txt" x="90" y="76">Kowalska Ewa</text><text class="s-txt" x="280" y="76">Elektryk</text><text class="s-txt" x="420" y="76">Serwis</text>
<g transform="translate(0 150)"><rect class="s-tabbar" x="1" y="0" width="638" height="49" rx="7"/>
<rect class="s-tab on" x="14" y="12" width="90" height="26" rx="5"/><text class="s-txt" x="28" y="29">Osoby</text>
<rect class="s-tab" x="112" y="12" width="90" height="26" rx="5"/><text class="s-txt" x="124" y="29">Projekty</text>
<rect class="s-tab" x="210" y="12" width="110" height="26" rx="5"/><text class="s-txt" x="220" y="29">Przypisania</text>
<rect class="s-tab" x="328" y="12" width="100" height="26" rx="5"/><text class="s-txt" x="338" y="29">Ustawienia</text></g>
`,'Plan w Excelu: cztery arkusze o stałych nazwach');

/* ---------- treść ---------- */
const S=[];
const sec=(id,title,body)=>S.push({id,title,body});
const steps=(...a)=>'<ol class="help-steps">'+a.map(x=>'<li>'+x+'</li>').join('')+'</ol>';
const list=(...a)=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
const tip=t=>'<p class="help-tip"><b>Wskazówka.</b> '+t+'</p>';

sec('start','Pierwsze kroki',`
<p>Program przechowuje cały plan zespołu w jednym pliku na dysku: <b>Excel (.xlsx)</b>, CSV lub TXT. Nie ma wspólnej bazy ani synchronizacji — pracujesz na własnej kopii pliku.</p>
${ILL.files()}
${steps('<b>Otwórz</b> — wskaż plan z dysku (XLSX, CSV, TXT lub starszy JSON).','<b>Format pliku</b> — wybierz, w jakim formacie ma być zapisywany plan. Domyślnie Excel.','<b>Zapisz</b> — zapisuje zmiany w otwartym pliku (za pierwszym razem pyta o miejsce).','<b>Zapisz jako…</b> — zapisuje do innego pliku, np. jako kopię zapasową.')}
<p>Skróty: <kbd>Ctrl</kbd>+<kbd>S</kbd> — zapisz, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> — zapisz jako.</p>
${tip('Przycisk „Zastosuj” w formularzach zmienia tylko plan w programie. Na dysku zmiany pojawią się dopiero po kliknięciu „Zapisz”. Program nie zapisuje automatycznie, a przy zamykaniu okna przypomina o zapisie.')}`);

sec('harmonogram','Harmonogram — jak go czytać',`
<p>Każda osoba ma własny wiersz, a każde zadanie jest paskiem na osi czasu. Kolor paska to kolor projektu.</p>
${ILL.overview()}
${steps('<b>Nazwisko i imię</b> — kliknięcie otwiera dodawanie zadania dla tej osoby.','<b>Pasek</b> — zadanie osoby w projekcie. Kliknięcie otwiera edycję.','<b>Kreskowany pasek</b> — etap „Uruchomienie”. Pasek bez kreskowania to etap „Offline”.','<b>Szare tło</b> — weekendy.','<b>Czerwona linia</b> — dzisiejszy dzień.','<b>Czerwone tło wiersza</b> — osoba jest obciążona ponad 100% (suma wszystkich projektów w danym dniu), a przy nazwisku widać znacznik przeciążenia.')}
<p>Daty końcowe są włączone do zadania, a obciążenie liczone jest dla dni kalendarzowych (także weekendów).</p>`);

sec('nawigacja','Okres, zakres i zoom',`
<p>Nad kalendarzem przełączasz widoczny okres i sposób jego wyświetlania.</p>
${ILL.filters()}
${steps('<b>‹ ›</b> — poprzedni i następny okres; <b>Dzisiaj</b> wraca do bieżącej daty.','<b>Szukaj</b> — filtruje po osobie lub projekcie.','<b>Dni / Tygodnie</b> i <b>Zakres</b> (tydzień, miesiąc, 2–3 miesiące, pół roku, rok). Dla półrocza i roku wybierz kolumny „Tygodnie” — nagłówki będą czytelniejsze.','<b>Filtry</b> — temat/projekt, osoba i specjalizacja (z wielokrotnym wyborem), grupa osób.','<b>Wyczyść filtry</b> przywraca pełny widok; podsumowanie obok pokazuje, ile osób widzisz.')}
${list('<kbd>Ctrl</kbd> + kółko myszy nad kalendarzem — zoom (zmiana zakresu).','Kółko myszy — przewijanie.','<b>Wygląd pasków</b> (rozwijana sekcja) — wybierasz, co pokazują paski: pełna nazwa, skrót, numer tematu, opis lub wszystko; można też ukryć zaangażowanie (%).')}
${tip('Wybrane filtry zapisują się razem z planem, więc po ponownym otwarciu pliku widzisz ten sam widok.')}`);

sec('zadania','Dodawanie i edycja zadań',`
<p>Zadanie (przypisanie) łączy osobę z projektem na wybrany okres. Masz trzy sposoby, aby je dodać:</p>
${ILL.create()}
${list('<b>Kliknij nazwisko</b> — otworzy się formularz z datami równymi widocznemu zakresowi kalendarza.','<b>Przeciągnij po pustym wierszu</b> osoby — zaznaczony zakres trafi do formularza jako daty „Od” i „Do”. Klawisz <kbd>Esc</kbd> przerywa zaznaczanie.','<b>＋ Nowe przypisanie</b> (prawy górny róg) — pusty formularz.')}
<p>W formularzu uzupełniasz:</p>
${ILL.form()}
${steps('<b>Osoba</b> i <b>Projekt</b> — listy są posortowane: osoby po nazwisku, projekty po skrócie. Na początku listy projektów jest „Rezerwacja”, potem tematy 00-…','<b>Od</b> i <b>Do (włącznie)</b> — data końca nie może być wcześniejsza niż początek.','<b>Zaangażowanie (%)</b> — 1–100. Sumuje się ze wszystkich zadań osoby.','<b>Etap</b> — Offline lub Uruchomienie (patrz niżej). Pod spodem możesz dopisać notatkę.')}
<p><b>Etap zadania.</b> „Offline” to praca przygotowawcza, a „Uruchomienie” — prace na obiekcie (kreskowany pasek). Dni zadań z etapem „Uruchomienie” są podstawą liczenia delegacji (zobacz „Raporty”).</p>`);

sec('przesuwanie','Przesuwanie i zmiana długości',`
<p>Paski można poprawiać bez otwierania formularza — chwytasz je myszą.</p>
${ILL.move()}
${steps('<b>Krawędzie paska</b> — przeciągnij lewą lub prawą krawędź, aby skrócić albo wydłużyć zadanie.','<b>Cały pasek</b> — przeciągnij w bok, aby zmienić daty, albo na wiersz innej osoby, aby przenieść zadanie.')}
<p><kbd>Esc</kbd> w trakcie przeciągania anuluje zmianę. Edycja kończy się dopiero po puszczeniu przycisku myszy.</p>`);

sec('menu','Dzielenie i kopiowanie zadań',`
<p>Kliknij pasek <b>prawym przyciskiem myszy</b>, aby zobaczyć dodatkowe operacje. Wybierasz je strzałkami lub myszą.</p>
${ILL.menu()}
${list('<b>Podziel zadanie</b> — wskazujesz pierwszy dzień drugiej części. Pierwsza część kończy się dzień wcześniej; obie zachowują osobę, projekt, etap, zaangażowanie i notatkę.','<b>Kopiuj dla innych osób</b> — tworzy takie samo zadanie dla wybranych osób (przydatne, gdy cały zespół pracuje nad tym samym).','<b>＋ Nowy projekt</b> — szybkie dodanie projektu bez wychodzenia z harmonogramu.')}
${ILL.split()}
<p>Te same polecenia („Podziel zadanie”, „Kopiuj dla innych osób”) znajdziesz też jako przyciski w formularzu zadania.</p>`);

sec('osoby','Osoby',`
<p>W zakładce <b>Osoby</b> prowadzisz listę zespołu.</p>
${ILL.catalog()}
${steps('Nazwę wpisuj w formacie <b>Nazwisko Imię</b> (np. „Kowalski Jan”). Po pierwszym członie sortowane są listy wyboru osób.')}
${list('<b>Specjalizacja / dział</b> — używana w filtrze specjalizacji na harmonogramie.','<b>Grupa</b> — dowolny tekst; pozwala filtrować zespoły (np. Robotyk, Serwis).','<b>Dwuklik</b> na wierszu albo przycisk <b>Edytuj</b> otwiera formularz. Z formularza można też usunąć osobę.','Liczba w kolumnie „Przypisania” pokazuje, ile zadań ma dana osoba.')}`);

sec('projekty','Projekty',`
<p>W zakładce <b>Projekty</b> zarządzasz tematami, na których pracuje zespół.</p>
${ILL.projectform()}
${steps('<b>Nr tematu</b> — tematy zaczynające się od „00-” są wyświetlane na początku list wyboru.','<b>Skrót</b> — krótka nazwa widoczna na paskach; po niej sortowane są listy projektów.','<b>Kraj delegacji</b> — ustaw „Niemcy”, aby dni zadań „Uruchomienie” w tym projekcie były liczone jako delegacja w Niemczech.')}
${list('<b>Kolor projektu</b> — kolor pasków. Przycisk „Automatyczne generowanie kolorów” (widoczny w tej zakładce) nadaje wszystkim projektom, oprócz rezerwacji, nowe kolory.','<b>Rezerwacja bez projektu</b> — stała pozycja programu, do której przypisujesz terminy zarezerwowane „na zapas”. Nie można jej edytować ani usunąć, ale możesz nadać jej numer tematu w pliku — program go zachowa. Rezerwacja jest zawsze pierwsza na liście projektów.','Dwuklik na wierszu lub „Edytuj” otwiera formularz projektu.')}`);

sec('samochody','Samochody',`
<p>Zakładka <b>Samochody</b> pozwala rezerwować auta firmowe dla projektów.</p>
${ILL.cars()}
${steps('<b>Przeciągnij po pustym wierszu</b> samochodu — otworzy się formularz rezerwacji z wybranym okresem.','<b>Pasek rezerwacji</b> — kliknięcie otwiera edycję; przeciągnięcie przesuwa termin albo przenosi na inny samochód, a krawędzie zmieniają długość.')}
<p>W formularzu rezerwacji wskazujesz samochód, projekt, daty, kierowcę, liczbę osób i notatkę. Program pilnuje, aby:</p>
${list('terminy rezerwacji tego samego samochodu nie nakładały się,','liczba osób (razem z kierowcą) nie przekraczała liczby miejsc w samochodzie.')}
<p>Zakładka <b>Konfiguracja samochodów</b> (przycisk „＋ Dodaj samochód”) zawiera dane aut: numer rejestracyjny, markę i model, kierowcę, stan licznika, winiety, termin przeglądu, opony, liczbę miejsc (łącznie z kierowcą) oraz typ użytkowania — <b>Sekcyjne</b> lub <b>Indywidualne</b>. Filtry nad kalendarzem pozwalają ograniczyć widok do projektu lub typu użytkowania.</p>`);

sec('raporty','Raporty dostępności',`
<p>Zakładka <b>Raporty</b> odpowiada na pytanie: kto jest wolny w danym okresie?</p>
${ILL.report()}
${steps('<b>Wolny (0%)</b> — zielony pasek.','<b>Częściowo wolny (1–99%)</b> — żółty.','<b>Pełne obciążenie (100%)</b> — szary.','<b>Przeciążenie (ponad 100%)</b> — czerwony.','Obramowanie paska oznacza dni, w których osoba spełnia wybrany warunek.')}
${list('Wybierz okres („Od”, „Do”) albo zaznacz go na kalendarzu — przeciągnij po pustym wierszu; krawędzie zaznaczenia można przesuwać.','<b>Szukaj osób</b>: z obciążeniem poniżej 100%, bez przypisanych projektów albo z obciążeniem 1–99%.','<b>Warunek</b> może być spełniony co najmniej jednego dnia albo przez cały okres.','Raport sumuje obciążenie ze wszystkich projektów dla każdego dnia kalendarzowego (z weekendami), a filtry harmonogramu go nie ograniczają. Maksymalny zakres to 366 dni; dłuższe listy są dzielone na strony.')}`);

sec('delegacje','Dni delegacji w Niemczech',`
<p>Pod raportem dostępności znajdziesz podsumowanie dni spędzonych na delegacji w Niemczech w wybranym okresie.</p>
${ILL.delegation()}
${steps('<b>Podsumowanie</b> — łączna liczba dni oraz liczba osób.','<b>Tabela</b> — dla każdej osoby liczba dni i rozbicie na projekty.')}
${list('Liczone są tylko zadania z etapem <b>Uruchomienie</b> w projektach, którym ustawiono kraj delegacji <b>Niemcy</b>.','Liczą się dni kalendarzowe z weekendami, obie daty włącznie.','Zadania tej samej osoby, które się nakładają, liczą się jeden raz.')}
${tip('Okres do podsumowania wybierasz tak samo jak dla raportu dostępności — nad nim.')}`);

sec('excel','Praca z Excelem',`
<p>Plan zapisany jako Excel (.xlsx) zawiera cztery arkusze o stałych nazwach. Możesz je edytować w Excelu i ponownie otworzyć w programie.</p>
${ILL.excel()}
${list('<b>Osoby</b> — ID, Nazwa (Nazwisko Imię), Specjalizacja, Grupa.','<b>Projekty</b> — ID, Nazwa, Skrót, Nr tematu, Opis, Kolor, Kraj delegacji.','<b>Przypisania</b> — powiązania osób i projektów, daty Od/Do, zaangażowanie (liczba 1–100), etap i notatka.','<b>Ustawienia</b> — wersja formatu, wygląd i zapisane filtry.')}
${steps('Zachowaj nazwy arkuszy, nagłówki, unikalne ID oraz powiązania osób z projektami.','Wpisuj wartości, nie formuły. ID i numery tematów traktuj jako tekst (zachowasz początkowe zera).','Zamknij plik w Excelu, zanim zapiszesz go z programu — nie edytuj jednej kopii w obu aplikacjach naraz.','Przed większą edycją zrób kopię pliku.')}
<p>Starsze pliki CSV, TXT i JSON można otworzyć, a następnie przenieść do Excela: wybierz format „Excel (.xlsx)” i kliknij „Zapisz jako…”.</p>`);

sec('aktualizacje','Aktualizacje i wygląd',`
<p>W lewym dolnym rogu widać numer wersji i przycisk <b>Sprawdź aktualizacje</b>.</p>
${steps('Kliknij „Sprawdź aktualizacje”. Jeśli jest nowa wersja, program ją pokaże.','Kliknij „Zainstaluj i uruchom ponownie”. Program pobiera aktualizację, sprawdza jej integralność, instaluje i uruchamia się ponownie.','Przed aktualizacją zapisz plan — niezapisane zmiany przepadają przy ponownym uruchomieniu.')}
<p>Pole <b>Wygląd</b> w lewym panelu przełącza motyw jasny i ciemny.</p>`);

sec('skroty','Skróty i podpowiedzi',`
<table class="help-table"><thead><tr><th>Skrót</th><th>Działanie</th></tr></thead><tbody>
<tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>Zapisz plan</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd></td><td>Zapisz plan jako…</td></tr>
<tr><td><kbd>F1</kbd></td><td>Otwórz tę pomoc</td></tr>
<tr><td><kbd>Ctrl</kbd> + kółko myszy</td><td>Zmiana zakresu (zoom) kalendarza</td></tr>
<tr><td>Kółko myszy</td><td>Przewijanie kalendarza</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Przerwij przeciąganie, zamknij menu lub okno</td></tr>
<tr><td>Prawy przycisk na pasku</td><td>Podziel / kopiuj zadanie, nowy projekt</td></tr>
<tr><td>Dwuklik na wierszu listy</td><td>Edycja osoby lub projektu</td></tr>
<tr><td>Klik w nazwisko</td><td>Nowe zadanie dla osoby w widocznym okresie</td></tr>
</tbody></table>
<p>Jeśli program nie uruchamia się, szczegóły błędu znajdziesz w pliku <code>%LOCALAPPDATA%\\PlanZespolu\\blad.log</code>.</p>`);

/* ---------- okno ---------- */
function build(){
  const d=el('dialog','');d.id='help-dialog';d.setAttribute('aria-labelledby','help-title');
  d.innerHTML=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
   <pattern id="h-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="rgba(0,0,0,.2)"/></pattern>
   <marker id="h-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#28785a"/></marker></defs></svg>
   <div class="help-head"><h2 id="help-title">Jak używać programu</h2><button type="button" class="help-close" aria-label="Zamknij">×</button></div>
   <div class="help-body"><nav class="help-toc" aria-label="Spis treści"></nav><div class="help-content" tabindex="0"></div></div>`;
  const toc=d.querySelector('.help-toc'),content=d.querySelector('.help-content');
  S.forEach((s,i)=>{
    const a=el('a','',(i+1)+'. '+s.title);a.href='#help-'+s.id;
    a.onclick=e=>{e.preventDefault();d.querySelector('#help-'+s.id).scrollIntoView({block:'start'});};
    toc.appendChild(a);
    const sc=el('section','help-section','<h3>'+(i+1)+'. '+s.title+'</h3>'+s.body);sc.id='help-'+s.id;content.appendChild(sc);
  });
  d.querySelector('.help-close').onclick=()=>d.close();
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  document.body.appendChild(d);return d;
}
let dialog=null;
function open(){if(!dialog)dialog=build();if(!dialog.open)dialog.showModal();dialog.querySelector('.help-content').scrollTop=0}
const button=document.getElementById('help-open');
if(button)button.onclick=open;
document.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();open()}});
window.openHelp=open;
})();
