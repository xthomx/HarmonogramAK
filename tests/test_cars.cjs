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
