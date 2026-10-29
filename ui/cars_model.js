function validateFleet(plan){
 const cars=plan.cars??[],bookings=plan.carReservations??[];
 for(const items of [cars,bookings])if(!Array.isArray(items)||items.length>10000||items.some(x=>!x||typeof x.id!=='string'||!x.id.trim())||new Set(items.map(x=>x.id)).size!==items.length)throw Error('Nieprawidłowe lub powtórzone ID samochodów / rezerwacji.');
 const plates=new Set();
 for(const car of cars){
  if(typeof car.name!=='string'||!car.name.trim()||typeof car.plate!=='string'||!car.plate.trim())throw Error('Wpisz nazwę samochodu i numer rejestracyjny.');
  const plate=car.plate.toUpperCase().replace(/\s/g,'');if(plates.has(plate))throw Error('Ten numer rejestracyjny już istnieje.');plates.add(plate);
  if(!Number.isInteger(car.seats)||car.seats<1||car.seats>100)throw Error('Liczba miejsc: od 1 do 100, łącznie z kierowcą.');
  if(!['Sekcyjne','Indywidualne'].includes(car.usage)||typeof(car.owner??'')!=='string')throw Error('Nieprawidłowy typ użytkowania samochodu.');
 }
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 for(const car of cars){
  if(car.project&&!plan.projects?.some(p=>p.id===car.project))throw Error('Wybierz istniejący projekt samochodu.');
  for(const key of ['project','driver','route','de','tires','kp','notes'])if(key in car&&typeof car[key]!=='string')throw Error('Nieprawidłowe pole samochodu: '+key);
  if('odometer' in car&&(!Number.isInteger(car.odometer)||car.odometer<0||car.odometer>99999999))throw Error('Stan licznika: liczba całkowita od 0 do 99999999 km.');
  for(const key of ['vignetteRO','vignetteSK','vignetteHU','vignetteCZ','vignetteAT','inspection'])if(key in car&&car[key]!==''&&!validDate(car[key]))throw Error('Nieprawidłowa data ważności: '+key);
 }
 const byCar=new Map();
 for(const b of bookings){
  const car=cars.find(c=>c.id===b.car);
  if('driver' in b&&(typeof b.driver!=='string'||b.driver&&!(plan.people||[]).some(p=>p.id===b.driver)))throw Error('Kierowca rezerwacji musi wskazywać istniejącą osobę.');
  if(!car||!plan.projects?.some(p=>p.id===b.project))throw Error('Wybierz istniejący samochód i projekt.');
  if(!validDate(b.start)||!validDate(b.end)||b.start>b.end)throw Error('Sprawdź daty rezerwacji.');
  if(!Number.isInteger(b.passengers)||b.passengers<1||b.passengers>car.seats)throw Error('Liczba osób przekracza liczbę miejsc w samochodzie lub jest nieprawidłowa.');
  if(typeof(b.note??'')!=='string')throw Error('Nieprawidłowa notatka.');
  if(!byCar.has(b.car))byCar.set(b.car,[]);byCar.get(b.car).push(b);
 }
 for(const items of byCar.values()){
  items.sort((a,b)=>a.start.localeCompare(b.start));
  for(let i=1;i<items.length;i++)if(items[i].start<=items[i-1].end)throw Error('Samochód jest już zarezerwowany w tym terminie (daty końcowe są wliczone).');
 }
 return true;
}
function validFleet(plan){try{return validateFleet(plan)}catch{return false}}
function nextFleetId(items,prefix){
 const numbers=items.map(item=>new RegExp('^'+prefix+'([1-9][0-9]*)$').exec(item.id)).filter(Boolean).map(m=>Number(m[1]));
 const next=Math.max(0,...numbers)+1;
 if(!Number.isSafeInteger(next))throw Error('Przekroczono zakres identyfikatorów.');
 return prefix+next;
}
function normalizeFleetIds(plan){
 validateFleet(plan);
 const cars=plan.cars||[],bookings=plan.carReservations||[],mapping=new Map();
 for(const car of cars)if(!/^a[1-9][0-9]*$/.test(car.id)){const old=car.id;car.id=nextFleetId(cars,'a');mapping.set(old,car.id)}
 for(const booking of bookings){if(mapping.has(booking.car))booking.car=mapping.get(booking.car);if(!/^ra[1-9][0-9]*$/.test(booking.id))booking.id=nextFleetId(bookings,'ra')}
 return plan;
}
if(typeof module!=='undefined'&&module.exports)module.exports={validateFleet,validFleet,nextFleetId,normalizeFleetIds};

// Expiry is inclusive: the warning starts on the following calendar day.
function vignetteWarningSegments(car,start,end){
 const countries=['RO','SK','HU','CZ','AT'];
 const nextDay=s=>new Date(Date.parse(s+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const expiries=countries.filter(c=>car['vignette'+c]).map(country=>({country,start:nextDay(car['vignette'+country])})).filter(x=>x.start<=end);
 const points=[...new Set([start,...expiries.map(x=>x.start).filter(d=>d>start)])].sort();
 return points.map((date,i)=>({start:date,end:i+1<points.length?new Date(Date.parse(points[i+1]+'T00:00:00Z')-86400000).toISOString().slice(0,10):end,countries:expiries.filter(x=>x.start<=date).map(x=>x.country)})).filter(x=>x.countries.length);
}
if(typeof module!=='undefined'&&module.exports)module.exports.vignetteWarningSegments=vignetteWarningSegments;

function eligibleCarDrivers(plan,booking){
 const ids=new Set((plan.assignments||[]).filter(a=>a.project===booking.project&&a.start<=booking.end&&a.end>=booking.start).map(a=>a.person));
 return (plan.people||[]).filter(p=>ids.has(p.id));
}
function normalizeBookingDrivers(plan){
 for(const b of plan.carReservations||[])if(b.driver&&!eligibleCarDrivers(plan,b).some(p=>p.id===b.driver))delete b.driver;
 return plan;
}
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{eligibleCarDrivers,normalizeBookingDrivers});
