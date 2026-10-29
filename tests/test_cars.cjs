const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateFleet,validFleet}=require('../ui/cars_model.js');
const car=(id='c1',seats=5)=>({id,name:'Auto '+id,plate:id,seats,usage:'Sekcyjne',owner:'PLC'});
const booking=(overrides={})=>({id:'b1',car:'c1',project:'p1',start:'2026-11-01',end:'2026-11-05',passengers:4,note:'Wyjazd',...overrides});
const plan=(bookings=[])=>({projects:[{id:'p1'}],cars:[car(),car('c2',2)],carReservations:bookings});
test('legacy plans without cars remain valid',()=>assert.equal(validFleet({projects:[]}),true));
test('vehicle and booking valid within capacity',()=>assert.equal(validateFleet(plan([booking()])),true));
test('capacity enforced when moving to smaller car',()=>assert.throws(()=>validateFleet(plan([booking({car:'c2'})])),/miejsc/));
test('overlapping endpoint is a conflict, next day is permitted',()=>{
 assert.throws(()=>validateFleet(plan([booking(),booking({id:'b2',start:'2026-11-05',end:'2026-11-06'})])),/zarezerwowany/);
 assert.equal(validateFleet(plan([booking(),booking({id:'b2',start:'2026-11-06',end:'2026-11-07'})])),true);
});
test('different cars may be reserved simultaneously',()=>assert.equal(validateFleet(plan([booking(),booking({id:'b2',car:'c2',passengers:2})])),true));
test('invalid references, dates, capacity, type and duplicate plate rejected',()=>{
 for(const changes of [{car:'missing'},{project:'missing'},{start:'2026-02-30'},{start:'2027-01-01'},{passengers:0},{passengers:2.5}])assert.equal(validFleet(plan([booking(changes)])),false);
 for(const changes of [{seats:0},{seats:2.5},{usage:'Unknown'},{plate:' c 2 '}]){const p=plan();Object.assign(p.cars[0],changes);assert.equal(validFleet(p),false)}
});

const {nextFleetId,normalizeFleetIds}=require('../ui/cars_model.js');
test('sequential vehicle and reservation IDs avoid existing IDs',()=>{
 assert.equal(nextFleetId([],'a'),'a1');assert.equal(nextFleetId([{id:'a1'},{id:'a3'}],'a'),'a4');
 assert.equal(nextFleetId([{id:'ra12'}],'ra'),'ra13');
});
test('legacy ID migration preserves car links and is idempotent',()=>{
 const p=plan([booking()]);p.cars.push(car('a1'));
 normalizeFleetIds(p);
 assert.deepEqual(p.cars.map(c=>c.id),['a2','a3','a1']);assert.equal(p.carReservations[0].id,'ra1');assert.equal(p.carReservations[0].car,'a2');
 const once=JSON.stringify(p);normalizeFleetIds(p);assert.equal(JSON.stringify(p),once);
});
test('expanded fields validate dates, odometer and assigned project',()=>{
 const p=plan();Object.assign(p.cars[0],{project:'p1',driver:'Jan',route:'RO / SK',odometer:0,vignetteRO:'2028-02-29',inspection:'2027-10-12',de:'Naklejka',tires:'Zimowe',kp:'O2',notes:'Uwagi'});assert.equal(validateFleet(p),true);
 for(const changes of [{odometer:-1},{odometer:1.5},{vignetteRO:'2027-02-29'},{project:'missing'}]){const bad=structuredClone(p);Object.assign(bad.cars[0],changes);assert.equal(validFleet(bad),false)}
});
