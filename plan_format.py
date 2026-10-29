"""Single-table, Excel-readable CSV/TXT. Native JSON remains import-only."""
import csv
import io
import json
import fleet

FIELDS = ['Typ', 'ID', 'Nazwa', 'Specjalizacja', 'Grupa', 'Skrot', 'Nr_tematu', 'Opis', 'Kolor',
          'Osoba_ID', 'Projekt_ID', 'Osoba', 'Projekt', 'Od', 'Do', 'Zaangazowanie_proc', 'Notatka', 'Ustawienie', 'Wartosc', 'Etap', 'Samochod_ID', 'Rejestracja', 'Miejsca', 'Uzytkowanie', 'Uzytkownik', 'Liczba_osob']
FIELDS += ['Kierowca_ID']
CAR_FIELDS = {'Kierowca_ID','Samochod_ID', 'Rejestracja', 'Miejsca', 'Uzytkowanie', 'Uzytkownik', 'Liczba_osob'}
CAR_EXTRA = {'project': 'Projekt_ID', 'driver': 'Kierowca', 'route': 'Gdzie_jezdzi', 'odometer': 'Stan_licznika', 'vignetteRO': 'Winieta_RO', 'vignetteSK': 'Winieta_SK', 'vignetteHU': 'Winieta_HU', 'vignetteCZ': 'Winieta_CZ', 'vignetteAT': 'Winieta_AT', 'de': 'DE', 'inspection': 'Przeglad', 'tires': 'Opony', 'kp': 'KP_O2_12_10_2026', 'notes': 'Uwagi_auta'}
FIELDS += [c for c in CAR_EXTRA.values() if c not in FIELDS]
CAR_FIELDS.update(set(CAR_EXTRA.values()) - {"Projekt_ID"})
MAPS = {
    'SAMOCHOD': ('cars', {'id':'ID','name':'Nazwa','plate':'Rejestracja','seats':'Miejsca','usage':'Uzytkowanie','owner':'Uzytkownik', **CAR_EXTRA}),
    'REZERWACJA_AUTA': ('carReservations', {'id':'ID','car':'Samochod_ID','project':'Projekt_ID','start':'Od','end':'Do','passengers':'Liczba_osob','note':'Notatka','driver':'Kierowca_ID'}),
    'OSOBA': ('people', {'id':'ID','name':'Nazwa','role':'Specjalizacja','group':'Grupa'}),
    'PROJEKT': ('projects', {'id':'ID','name':'Nazwa','shortName':'Skrot','topicNumber':'Nr_tematu','description':'Opis','color':'Kolor'}),
    'PRZYPISANIE': ('assignments', {'id':'ID','person':'Osoba_ID','project':'Projekt_ID','start':'Od','end':'Do','load':'Zaangazowanie_proc','note':'Notatka','stage':'Etap'})}
def stage(value):
    value = (value or 'Offline').strip() or 'Offline'
    if value not in ('Offline', 'Uruchomienie'):
        raise ValueError('Etap musi mieć wartość Offline albo Uruchomienie.')
    return value

DANGEROUS = "=+-@\t\r\n'"

def safe(value):
    value = str(value)
    return "'" + value if value and value[0] in DANGEROUS else value

def unsafe(value):
    return value[1:] if len(value)>1 and value[0]=="'" and value[1] in DANGEROUS else value

def format_version(plan):
    if any(b.get('driver') for b in plan.get('carReservations', [])): return 'PLAN_ZESPOLU_4'
    if any(any(k in car for k in CAR_EXTRA) for car in plan.get('cars',[])):
        return 'PLAN_ZESPOLU_3'
    return 'PLAN_ZESPOLU_2' if 'cars' in plan or 'carReservations' in plan else 'PLAN_ZESPOLU_1'

def dumps(plan, extension):
    fleet.validate(plan)
    out = io.StringIO(newline='')
    writer = csv.DictWriter(out, fieldnames=FIELDS, delimiter='\t' if extension=='.txt' else ';', lineterminator='\r\n')
    writer.writeheader()
    def write(row): writer.writerow({k:safe(v) for k,v in row.items()})
    write({'Typ':'FORMAT','Wartosc':format_version(plan)})
    for typ,(key,mapping) in MAPS.items():
        for item in plan.get(key,[]):
            row={'Typ':typ, **{col:item.get(prop,'') for prop,col in mapping.items()}}
            if typ=='PRZYPISANIE':
                row['Etap'] = stage(item.get('stage'))
                person=next((p for p in plan['people'] if p['id']==item['person']),{})
                project=next((p for p in plan['projects'] if p['id']==item['project']),{})
                row.update(Osoba=person.get('name',''),Projekt=project.get('name',''),Specjalizacja=person.get('role',''),Grupa=person.get('group',''),Nr_tematu=project.get('topicNumber',''))
            if typ=='REZERWACJA_AUTA':
                car=next((c for c in plan.get('cars',[]) if c['id']==item['car']),{})
                project=next((p for p in plan['projects'] if p['id']==item['project']),{})
                row.update(Nazwa=car.get('name',''),Rejestracja=car.get('plate',''),Projekt=project.get('name',''),Kierowca=next((p['name'] for p in plan['people'] if p['id']==item.get('driver')),'Nieznany'))
            write(row)
    write({'Typ':'USTAWIENIE','Ustawienie':'demo','Wartosc':str(bool(plan.get('demo',False))).lower()})
    for key,value in plan.get('calendarDisplay',{}).items():
        if key in ('label','unit','showLoad'):
            write({'Typ':'USTAWIENIE','Ustawienie':'display.'+key,'Wartosc':str(value).lower() if isinstance(value,bool) else value})
    for key,value in plan.get('calendarFilters',{}).items():
        if key in ('project','person','group','specialization'):
            for v in (value or ['']) if isinstance(value,list) else [value]:
                write({'Typ':'USTAWIENIE','Ustawienie':'filter.'+key,'Wartosc':v})
    return out.getvalue()

def loads(text, extension):
    if extension=='.json': return json.loads(text)
    delimiter='\t' if extension=='.txt' else ';'
    # Accept comma CSV produced by Excel in other regional settings.
    header=text.splitlines()[0] if text else ''
    if extension=='.csv' and ';' not in header and ',' in header: delimiter=','
    reader=csv.DictReader(io.StringIO(text,newline=''),delimiter=delimiter,strict=True)
    if not reader.fieldnames or (set(FIELDS)-{'Etap'}-CAR_FIELDS)-set(reader.fieldnames) or len(set(reader.fieldnames))!=len(reader.fieldnames):
        raise ValueError('Nieprawidłowe nagłówki tabeli planu.')
    plan={'people':[],'projects':[],'assignments':[],'demo':False,'calendarDisplay':{},'calendarFilters':{'project':[],'person':[],'group':''}}
    found=False
    for raw in reader:
        if None in raw or any(v is None for v in raw.values()): raise ValueError('Nieprawidłowa liczba kolumn.')
        row={k:unsafe(v) for k,v in raw.items()}
        if not any(row.values()): continue
        typ=row['Typ']
        if typ=='FORMAT':
            if found or row['Wartosc'] not in ('PLAN_ZESPOLU_1','PLAN_ZESPOLU_2','PLAN_ZESPOLU_3','PLAN_ZESPOLU_4'): raise ValueError('Nieobsługiwana wersja pliku.')
            found=True
            if row['Wartosc'] in ('PLAN_ZESPOLU_2','PLAN_ZESPOLU_3','PLAN_ZESPOLU_4'):
                plan.setdefault('cars',[]);plan.setdefault('carReservations',[])
        elif typ in MAPS:
            key,mapping=MAPS[typ];item={prop:row.get(col,'') for prop,col in mapping.items()}
            if typ=='PRZYPISANIE':
                item['load']=int(item['load'])
                item['stage']=stage(item.get('stage'))
            if typ=='SAMOCHOD':
                item['seats']=int(item['seats'])
                for prop in CAR_EXTRA:
                    if item[prop]=='': item.pop(prop)
                if 'odometer' in item: item['odometer']=int(item['odometer'])
            if typ=='REZERWACJA_AUTA':
                item['passengers']=int(item['passengers'])
                if not item.get('driver'): item.pop('driver',None)
            plan.setdefault(key,[]).append(item)
        elif typ=='USTAWIENIE':
            key,value=row['Ustawienie'],row['Wartosc']
            if key=='demo': plan['demo']=value=='true'
            elif key in ('display.label','display.unit','display.showLoad'):
                plan['calendarDisplay'][key[8:]]=value=='true' if key=='display.showLoad' else value
            elif key in ('filter.project','filter.person','filter.specialization'): 
                selected=plan['calendarFilters'].setdefault(key[7:],[])
                if value: selected.append(value)
            elif key=='filter.group': plan['calendarFilters']['group']=value
        else: raise ValueError('Nieznany typ wiersza: '+typ)
    if not found: raise ValueError('Brak wiersza wersji formatu.')
    fleet.validate(plan)
    return plan

