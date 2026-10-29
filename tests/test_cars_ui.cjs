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
  await page.click('[data-view="cars"]');
  await page.evaluate(()=>{data.projects=[{id:'p1',name:'Linia A',shortName:'LA',topicNumber:'001',description:'Projekt A',color:'#347c68'}]});
  await page.click('#cars-new-car');
  await page.selectOption('#car-fields [name=project]','p1');
  for(const [key,value] of Object.entries({driver:'Jan Kowalski',route:'Bratysława',odometer:'123456',vignetteRO:'2026-11-12',vignetteSK:'2027-02-03',vignetteHU:'2027-03-04',vignetteCZ:'2027-04-05',vignetteAT:'2027-05-06',de:'Euro 6',inspection:'2027-10-12',tires:'Zimowe',kp:'O2',notes:'Auto sekcyjne'})){
   if(key.startsWith('vignette'))await page.selectOption('[data-vignette-mode='+key.slice(8)+']','date');
   await page.fill('#car-fields [name='+key+']',value);
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
   carsCursor=dt('2026-11-01');carsTab='calendar';renderCars();
  });
  await page.click('#add');
  await page.fill('#car-fields [name=start]','2026-11-10');
  await page.fill('#car-fields [name=end]','2026-11-15');
  await page.fill('#car-fields [name=passengers]','4');
  await page.click('#car-form button[type=submit]');
  assert.equal(await page.evaluate(()=>data.carReservations.length),1);
  assert.equal(await page.evaluate(()=>data.carReservations[0].id),'ra1');
  const booking=page.locator('#cars-chart [data-booking]').first();
  assert.match(await booking.innerText(),/⚠ RO/);
  assert.equal(await booking.locator('.vignette-warning').evaluate(el=>el.style.left),'50%');
  assert.equal(await booking.locator('.vignette-warning').evaluate(el=>el.style.width),'50%');
  assert.equal(await page.locator('[data-car-row="a1"] .label').innerText(),'SK 12345');
  assert.ok((await page.locator('[data-car-row="a1"]').boundingBox()).height<=32);

  // Click opens edit, without creating a second booking.
  await booking.click();
  assert.equal(await page.locator('#car-fields [name=start]').inputValue(),'2026-11-10');
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
  assert.equal(await page.evaluate(()=>data.cars[0].project),'');
  assert.deepEqual(errors,[]);
  console.log('Cars UI: create/configure, reserve/edit, conflicts, capacity, resize, year view, theme, project deletion PASS');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
