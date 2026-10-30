// Browser integration test run against the UI shipped inside the Windows EXE.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('ui/index.html')).href);
  const reservedId='__reservation_without_project__';
  assert.equal(await page.evaluate(()=>data.projects.filter(p=>isReservationProject(p.id)).length),1);
  await page.click('[data-view="projects"]');
  assert.match(await page.locator('#catalog').innerText(),/Rezerwacja bez projektu/);
  assert.equal(await page.locator('#catalog [data-item="'+reservedId+'"]').count(),0);
  await page.evaluate(()=>open('projects','__reservation_without_project__'));
  assert.equal(await page.locator('#modal').evaluate(el=>el.open),false);
  await page.click('[data-view="cars"]');
  await page.evaluate(()=>{data.projects=[{id:'p1',name:'Linia A',shortName:'LA',topicNumber:'001',description:'Projekt A',color:'#347c68'}]});
  await page.click('#cars-new-car');
  assert.equal(await page.locator('#car-fields [name=project],#car-fields [name=route]').count(),0);
  for(const [key,value] of Object.entries({driver:'Jan Kowalski',odometer:'123456',vignetteRO:'2026-11-12',vignetteSK:'2027-02-03',vignetteHU:'2027-03-04',vignetteCZ:'2027-04-05',vignetteAT:'2027-05-06',de:'Green Zone',inspection:'2027-10-12',tires:'Zimowe',kp:'O2',notes:'Auto sekcyjne'})){
   if(key.startsWith('vignette'))await page.selectOption('[data-vignette-mode='+key.slice(8)+']','date');
   if(key==='de')await page.selectOption('#car-fields [name=de]',value);else await page.fill('#car-fields [name='+key+']',value);
  }
  await page.fill('#car-fields [name=name]','Skoda Octavia');
  await page.fill('#car-fields [name=plate]','SK 12345');
  await page.fill('#car-fields [name=seats]','5');
  await page.fill('#car-fields [name=owner]','Sekcja PLC');
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.cars.length),1);
  assert.equal(await page.evaluate(()=>data.cars[0].id),'a1');
  assert.equal(await page.evaluate(()=>data.cars[0].odometer),123456);
  await page.click('#cars-list-tab');
  assert.match(await page.locator('#cars-list').innerText(),/SK 12345/);
  await page.click('[data-car-edit="a1"]');
  assert.equal(await page.locator('#car-fields [name=inspection]').inputValue(),'2027-10-12');
  assert.equal(await page.locator('#car-fields [name=notes]').inputValue(),'Auto sekcyjne');
  await page.selectOption('[data-vignette-mode=SK]','none');
  assert.equal(await page.locator('[name=vignetteSK]').isVisible(),false);
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.cars[0].vignetteSK),undefined);
  await page.evaluate(()=>{
   data.projects=[{id:'p1',name:'Linia A',shortName:'LA',topicNumber:'001',description:'Projekt A',color:'#347c68'}];
   data.cars.push({id:'c2',name:'Drugie auto',plate:'SK 67890',seats:2,usage:'Indywidualne',owner:'Jan'});
   data.people=[{id:'driver1',name:'Adam Kierowca',role:''},{id:'driver2',name:'Poza projektem',role:''}];
   data.assignments=[{id:'driver-task',person:'driver1',project:'p1',start:'2026-11-01',end:'2026-11-30',load:100,note:''}];
   carsCursor=dt('2026-11-01');carsTab='calendar';renderCars();
  });
  await page.click('#add');
  await page.fill('#car-fields [name=start]','2026-11-10');
  await page.fill('#car-fields [name=end]','2026-11-15');
  await page.fill('#car-fields [name=passengers]','4');
  assert.equal(await page.locator('#car-fields [name=driver]').inputValue(),'');
  assert.equal(await page.locator('#car-fields [name=driver] option').count(),2);
  await page.selectOption('#car-fields [name=driver]','driver1');
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.carReservations.length),1);
  assert.equal(await page.evaluate(()=>data.carReservations[0].id),'ra1');
  assert.equal(await page.evaluate(()=>data.carReservations[0].driver),'driver1');
  const booking=page.locator('#cars-chart [data-booking]').first();
  assert.match(await booking.innerText(),/⚠ RO/);
  assert.equal(await booking.locator('.vignette-warning').evaluate(el=>el.style.left),'50%');
  assert.equal(await booking.locator('.vignette-warning').evaluate(el=>el.style.width),'50%');
  assert.equal(await page.locator('[data-car-row="a1"] .person-name').innerText(),'SK 12345');
  assert.equal(await page.locator('[data-car-row="a1"] .car-model').innerText(),'Skoda Octavia');
  const tip=await page.locator('[data-car-row="a1"] .label').getAttribute('title');
  assert.match(tip,/Kierowca: Jan Kowalski/);
  assert.match(tip,/Winieta SK: Brak/);
  assert.match(tip,/Uwagi: Auto sekcyjne/);
  assert.doesNotMatch(tip,/Projekt:|Gdzie jeździ:/);
  assert.ok((await page.locator('[data-car-row="a1"]').boundingBox()).height<=32);

  // Click opens edit, without creating a second booking.
  await booking.click();
  assert.equal(await page.locator('#car-fields [name=start]').inputValue(),'2026-11-10');
  assert.equal(await page.locator('#car-fields [name=driver]').inputValue(),'driver1');
  await page.fill('#car-fields [name=end]','2026-12-15');
  await page.fill('#car-fields [name=start]','2026-12-10');
  await page.locator('#car-fields [name=start]').dispatchEvent('change');
  assert.equal(await page.locator('#car-fields [name=driver]').inputValue(),'');
  assert.equal(await page.locator('#car-fields [name=driver] option').count(),1);
  await page.click('#car-cancel');
  // A second reservation on the same inclusive endpoint must be refused.
  await page.click('#add');
  await page.fill('#car-fields [name=start]','2026-11-15');
  await page.fill('#car-fields [name=end]','2026-11-17');
  await page.click('#car-form button[type=submit]');
  assert.match(await page.locator('#car-error').innerText(),/zarezerwowany/);
  await page.click('#car-cancel');
  const before=await page.evaluate(()=>JSON.stringify(data.carReservations));
  let bar=await booking.boundingBox(),other=await page.locator('[data-car-row="c2"] .track').boundingBox();
  await page.mouse.move(bar.x+bar.width/2,bar.y+bar.height/2);await page.mouse.down();
  await page.mouse.move(bar.x+bar.width/2,other.y+20,{steps:8});await page.mouse.up();
  assert.equal(await page.evaluate(()=>JSON.stringify(data.carReservations)),before,'Capacity violation must leave booking unchanged');
  // Resize the bar by one day.
  bar=await booking.boundingBox();const track=await page.locator('#cars-chart .track').first().boundingBox();
  await page.mouse.move(bar.x+bar.width-2,bar.y+12);await page.mouse.down();
  await page.mouse.move(bar.x+bar.width-2+track.width/30,bar.y+12,{steps:5});await page.mouse.up();
  assert.equal(await page.evaluate(()=>data.carReservations[0].end),'2026-11-16');
  await page.selectOption('#cars-scale','year');
  assert.equal(await page.locator('#cars-unit').inputValue(),'weeks');
  assert.ok(await page.locator('#cars-chart .week-column').count()>=52);
  assert.ok(await page.evaluate(()=>document.querySelector('#cars-chart').scrollWidth<=document.querySelector('#cars-chart').clientWidth+1));
  await page.evaluate(()=>applyTheme('dark'));
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.click('[data-view="projects"]');
  await page.click('#catalog [data-item="p1"]');
  page.once('dialog',dialog=>dialog.accept());await page.click('#delete');
  assert.equal(await page.evaluate(()=>data.carReservations.length),0,'Deleting a project removes linked car reservations');

  await page.evaluate(()=>{
   data.people=[{id:'person-test',name:'Jan',role:''}];
   open('assignments',null,{project:'__reservation_without_project__'});
  });
  await page.click('#form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.assignments[0].project),reservedId);
  await page.click('[data-view="cars"]');
  await page.click('#add');
  await page.selectOption('#car-fields [name=project]',reservedId);
  await page.fill('#car-fields [name=start]','2026-12-01');
  await page.fill('#car-fields [name=end]','2026-12-02');
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.carReservations[0].project),reservedId);
  // Individual cars have exactly one permanent user, also used as reservation driver.
  await page.click('#cars-new-car');
  await page.fill('#car-fields [name=name]','Auto Jana');
  await page.fill('#car-fields [name=plate]','SK IND1');
  await page.selectOption('#car-fields [name=usage]','Indywidualne');
  assert.equal(await page.locator('#car-fields [name=ownerId]').isVisible(),true);
  assert.equal(await page.locator('#car-fields [name=owner]').isVisible(),false);
  await page.selectOption('#car-fields [name=ownerId]','person-test');
  await page.selectOption('#car-fields [name=de]','Green Zone');
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.cars.at(-1).ownerId),'person-test');
  assert.equal(await page.evaluate(()=>data.cars.at(-1).de),'Green Zone');
  await page.evaluate(()=>openCarReservation(null,{car:data.cars.at(-1).id,start:'2026-12-03',end:'2026-12-04',project:'__reservation_without_project__'}));
  assert.equal(await page.locator('#car-fields [name=driver] option').count(),1);
  assert.equal(await page.locator('#car-fields [name=driver]').inputValue(),'person-test');
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.carReservations.at(-1).driver),'person-test');
  // Header drag pans all calendars, with day/week steps, without changing bookings.
  const storedPlan=await page.evaluate(()=>JSON.stringify(data));
  for(const [viewName,chartId] of [['plan','chart'],['cars','cars-chart'],['reports','range-chart']]){
   await page.click('[data-view="'+viewName+'"]');
   await page.evaluate(name=>{
    if(name==='plan'){cursor=dt('2026-11-01');$('#scale').value='month';data.calendarDisplay={...displaySettings(),unit:'days'};render()}
    if(name==='cars'){carsCursor=dt('2026-11-01');$('#cars-scale').value='month';$('#cars-unit').value='days';renderCars()}
    if(name==='reports'){rangeCursor=dt('2026-11-01');$('#range-scale').value='month';$('#range-unit').value='days';selectVisibleReportRange()}
   },viewName);
   const currentBounds=()=>page.evaluate(name=>name==='plan'?bounds():name==='cars'?carsBounds():rangeBounds(),viewName);
   let header=await page.locator('#'+chartId+' .head .days').boundingBox();
   const x=header.x+header.width*.7,y=header.y+header.height/2;
   await page.mouse.move(x,y);await page.mouse.down();
   await page.mouse.move(x-header.width*4/30,y,{steps:6});await page.mouse.up();
   assert.deepEqual(await currentBounds(),['2026-11-05','2026-12-04'],viewName+' daily pan');
   if(viewName==='reports')assert.equal(await page.locator('#report-start').inputValue(),'2026-11-05');
   header=await page.locator('#'+chartId+' .head .days').boundingBox();
   await page.mouse.move(header.x+header.width*.7,header.y+header.height/2);await page.mouse.down();
   await page.mouse.move(header.x+header.width*.6,header.y+header.height/2,{steps:4});
   await page.keyboard.press('Escape');await page.mouse.up();
   assert.deepEqual(await currentBounds(),['2026-11-05','2026-12-04'],viewName+' Escape restores view');
   await page.evaluate(name=>{
    if(name==='plan'){data.calendarDisplay.unit='weeks';render()}
    if(name==='cars'){$('#cars-unit').value='weeks';renderCars()}
    if(name==='reports'){$('#range-unit').value='weeks';renderRangeCalendar();renderReports()}
   },viewName);
   header=await page.locator('#'+chartId+' .head .days').boundingBox();
   await page.mouse.move(header.x+header.width*.7,header.y+header.height/2);await page.mouse.down();
   await page.mouse.move(header.x+header.width*(.7-7/30),header.y+header.height/2,{steps:8});await page.mouse.up();
   assert.deepEqual(await currentBounds(),['2026-11-12','2026-12-11'],viewName+' weekly pan');
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(data.assignments)),JSON.stringify(JSON.parse(storedPlan).assignments));
  assert.equal(await page.evaluate(()=>JSON.stringify(data.carReservations)),JSON.stringify(JSON.parse(storedPlan).carReservations));
  assert.deepEqual(errors,[]);
  console.log('Cars UI: create/configure, reserve/edit, conflicts, capacity, resize, year view, theme, project deletion PASS');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
