const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseAbsences,findAbsencePerson,applyAbsences,emlTexts}=require('../ui/absence_model.js');
const sentence='Dla pracownika Jan Nowak wprowadzono w okresie 2026-11-25 - 2026-11-27 nieobecność zwolnienie chorobowe.';
const plan=()=>({people:[{id:'p1',name:'Nowak Jan'},{id:'p2',name:'Żuk Anna'}],projects:[{id:'abs',name:'Nieobecność',topicNumber:'00-0001'}],assignments:[]});
let n=0;const newId=()=>'id'+(++n);
test('parses the sentence from plain text and HTML',()=>{
 assert.deepEqual(parseAbsences([sentence]).items,[{name:'Jan Nowak',start:'2026-11-25',end:'2026-11-27',type:'zwolnienie chorobowe'}]);
 assert.equal(parseAbsences(['<p>Dla&nbsp;pracownika <b>Anna Żuk</b> wprowadzono w okresie 01.12.2026 – 03.12.2026 nieobecność: urlop wypoczynkowy.</p>']).items[0].end,'2026-12-03');
});
test('reports invalid periods and dedupes repeated parts',()=>{
 assert.equal(parseAbsences(['Dla pracownika A B wprowadzono w okresie 2026-12-10 - 2026-12-09 nieobecność x.']).errors.length,1);
 assert.equal(parseAbsences([sentence,sentence]).items.length,1);
});
test('name order does not matter',()=>{
 const people=plan().people;
 assert.equal(findAbsencePerson(people,'Jan Nowak').person.id,'p1');
 assert.equal(findAbsencePerson(people,'Anna Zuk').person.id,'p2');
 assert.equal(findAbsencePerson(people,'Piotr Obcy').error,'brak');
});
test('adds 100 percent Offline assignment with the absence type as note, no duplicates',()=>{
 const p=plan(),items=parseAbsences([sentence]).items;
 const r=applyAbsences(p,items,newId);
 assert.equal(r.added.length,1);
 assert.deepEqual(p.assignments[0],{id:p.assignments[0].id,person:'p1',project:'abs',start:'2026-11-25',end:'2026-11-27',load:100,note:'Zwolnienie chorobowe',stage:'Offline'});
 assert.equal(applyAbsences(p,items,newId).skipped.length,1);
 assert.equal(p.assignments.length,1);
});
test('fails clearly without the 00-0001 project',()=>{
 const p=plan();p.projects=[];
 assert.equal(applyAbsences(p,parseAbsences([sentence]).items,newId).problems.length,1);
});
test('reads quoted-printable eml',()=>{
 const eml='Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nDla pracownika Jan Nowak wprowadzono w okresie 2026-12-30 - 2026-12-31 nieobecno=C5=9B=C4=87 urlop =\r\nwypoczynkowy.\r\n';
 assert.equal(parseAbsences(emlTexts(eml)).items[0].type,'urlop wypoczynkowy');
});
