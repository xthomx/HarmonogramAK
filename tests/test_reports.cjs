const {test}=require('node:test');const assert=require('node:assert/strict');
const {availabilityReport:report}=require('../ui/report_model.js');
const people=[{id:'p',name:'Anna'},{id:'q',name:'Piotr'}];
const a=(start,end,load=100,person='p')=>({start,end,load,person});
const r=(assignments,mode='under',match='any')=>report({people,assignments},'2026-01-01','2026-01-03',mode,match);
test('unassigned people are free every day',()=>{assert.equal(r([]).rows.length,2);assert.deepEqual(r([]).rows[0].loads,[0,0,0])});
test('overlapping tasks summed, inclusive end',()=>{const rows=r([a('2026-01-01','2026-01-02',60),a('2026-01-02','2026-01-03',50)]).rows;assert.deepEqual(rows[0].loads,[60,110,50]);assert.equal(rows[0].count,2)});
test('100 percent excluded even if filter hides assignments',()=>{const plan={people,assignments:[a('2026-01-01','2026-01-03')],calendarFilters:{project:['other']}};assert.deepEqual(report(plan,'2026-01-01','2026-01-03').rows.map(x=>x.person.id),['q'])});
test('any and all have different semantics',()=>{assert.equal(r([a('2026-01-01','2026-01-02')],'none','any').rows.length,2);assert.equal(r([a('2026-01-01','2026-01-02')],'none','all').rows.length,1)});
test('partial excludes unassigned people',()=>{assert.deepEqual(r([a('2026-01-01','2026-01-03',50)],'partial','all').rows.map(x=>x.person.id),['p'])});
test('clip assignments outside report range',()=>{assert.deepEqual(r([a('2025-12-01','2026-01-01',50),a('2026-02-01','2026-02-02')]).rows[0].loads,[50,0,0])});
test('invalid dates, reversed dates and excessive range rejected',()=>{for(const [start,end] of [['2026-02-30','2026-03-01'],['2026-01-03','2026-01-01'],['2025-01-01','2026-12-31']])assert.throws(()=>report({people,assignments:[]},start,end))});
test('leap year and one day supported',()=>{assert.equal(report({people,assignments:[]},'2024-01-01','2024-12-31').days,366);assert.equal(report({people,assignments:[]},'2026-01-01','2026-01-01').days,1)});

const {availabilityReport,reportSpan,reportSegments}=require('../ui/report_model.js');
test('half-month result occupies exactly the selected half of the timeline',()=>{
 const report=availabilityReport({people:[{id:'p',name:'A'}],assignments:[]},'2026-11-01','2026-11-15');
 const selected=reportSpan(report.start,report.end,'2026-11-01','2026-11-30');
 assert.deepEqual(selected,{left:0,width:50});
 const segment=reportSegments(report.rows[0],report.start)[0];
 assert.deepEqual(reportSpan(segment.start,segment.end,'2026-11-01','2026-11-30'),selected);
});
test('second half stays in the right half, without stretching to full width',()=>{
 assert.deepEqual(reportSpan('2026-11-16','2026-11-30','2026-11-01','2026-11-30'),{left:50,width:50});
});
test('changing loads partitions selected length without gaps or expansion',()=>{
 const segments=reportSegments({loads:[0,0,50,50,100,0],qualifies:[true,true,true,true,false,true]},'2026-11-10');
 assert.equal(segments.length,4);
 const spans=segments.map(s=>reportSpan(s.start,s.end,'2026-11-01','2026-11-30'));
 assert.equal(spans[0].left,30);
 assert.ok(Math.abs(spans.reduce((sum,s)=>sum+s.width,0)-20)<1e-10);
 for(let i=1;i<spans.length;i++)assert.ok(Math.abs(spans[i-1].left+spans[i-1].width-spans[i].left)<1e-10);
});
test('year view uses days proportionally, including leap day',()=>{
 assert.deepEqual(reportSpan('2024-01-01','2024-07-01','2024-01-01','2024-12-31'),{left:0,width:50});
});
test('partly hidden results clip to the same visible dates as selection',()=>{
 assert.deepEqual(reportSpan('2026-10-25','2026-11-15','2026-11-01','2026-11-30'),{left:0,width:50});
 assert.equal(reportSpan('2026-12-01','2026-12-05','2026-11-01','2026-11-30').width,0);
});
