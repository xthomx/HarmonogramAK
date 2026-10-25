function availabilityReport(plan,start,end,mode='under',match='any'){
 const dayMs=86400000,date=s=>new Date(s+'T00:00:00Z');
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+date(s))&&date(s).toISOString().slice(0,10)===s;
 if(!validDate(start)||!validDate(end)||end<start)throw Error('Wybierz poprawny zakres dat.');
 const days=Math.round((date(end)-date(start))/dayMs)+1;
 if(days>366)throw Error('Wybierz okres nie dłuższy niż 366 dni.');
 if(!['under','none','partial'].includes(mode)||!['any','all'].includes(match))throw Error('Nieprawidłowe kryterium raportu.');
 const perPerson=new Map();
 for(const a of plan.assignments){
  const first=Math.max(0,Math.round((date(a.start)-date(start))/dayMs)),last=Math.min(days-1,Math.round((date(a.end)-date(start))/dayMs));
  if(first>last)continue;
  if(!perPerson.has(a.person))perPerson.set(a.person,new Float64Array(days+1));
  const changes=perPerson.get(a.person);changes[first]+=a.load;changes[last+1]-=a.load;
 }
 const result=[];
 for(const person of plan.people){
  const changes=perPerson.get(person.id),loads=[],qualifies=[];let load=0,count=0;
  for(let i=0;i<days;i++){
   load+=changes?.[i]||0;loads.push(load);
   const ok=mode==='none'?load===0:mode==='partial'?load>0&&load<100:load<100;
   qualifies.push(ok);if(ok)count++;
  }
  if(match==='all'?count===days:count>0)result.push({person,loads,qualifies,count});
 }
 return {start,end,days,rows:result};
}
if(typeof module!=='undefined'&&module.exports)module.exports={availabilityReport};
