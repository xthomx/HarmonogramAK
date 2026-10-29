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
 const byCar=new Map();
 for(const b of bookings){
  const car=cars.find(c=>c.id===b.car);
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
if(typeof module!=='undefined'&&module.exports)module.exports={validateFleet,validFleet};
