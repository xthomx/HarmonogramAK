const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildScheduleExport}=require('../ui/export.js');
const plan=()=>({people:[{id:'p1',name:'Nowak Jan',role:'PLC',group:'Serwis'},{id:'p2',name:'Żuk Anna',group:'Robotyk'},{id:'p3',name:'Adamski Piotr',group:'Serwis'}],
 projects:[{id:'j1',name:'Linia',shortName:'LP-2',topicNumber:'25-0142',color:'#347c68'},{id:'j2',name:'Hala',shortName:'H'}],
 assignments:[{person:'p1',project:'j1',start:'2026-11-03',end:'2026-11-12',load:100},{person:'p2',project:'j2',start:'2026-11-05',end:'2026-11-09',load:60,stage:'Uruchomienie'}]});
const o={start:'2026-11-01',end:'2026-11-30',layout:'days',includeFree:true};
test('without filters only people with tasks, sorted by surname',()=>{
 const r=buildScheduleExport(plan(),o);assert.deepEqual(r.payload.people.map(p=>p.name),['Nowak Jan','Żuk Anna']);assert.equal(r.taskCount,2);
});
test('group selection lists free members too',()=>{
 const r=buildScheduleExport(plan(),{...o,group:'group:serwis'});assert.deepEqual(r.payload.people.map(p=>p.name),['Adamski Piotr','Nowak Jan']);
 assert.equal(buildScheduleExport(plan(),{...o,group:'group:serwis',includeFree:false}).peopleCount,1);
});
test('project filter limits tasks and people',()=>{
 const r=buildScheduleExport(plan(),{...o,projects:['j2']});assert.equal(r.peopleCount,1);assert.equal(r.payload.assignments[0].stage,'Uruchomienie');
});
test('invalid or empty selections return an error',()=>{
 assert.ok(buildScheduleExport(plan(),{...o,end:'2026-10-01'}).error);
 assert.ok(buildScheduleExport(plan(),{...o,start:'2025-01-01',end:'2026-12-31'}).error);
 assert.ok(buildScheduleExport(plan(),{...o,start:'2027-01-01',end:'2027-01-31'}).error);
});