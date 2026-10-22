import csv
import io
import json
import tempfile
from pathlib import Path
import unittest
from plan_format import dumps, loads
from main import atomic_write

class Formats(unittest.TestCase):
    def setUp(self):
        self.plan={'demo':False,'people':[{'id':'p1','name':'Łukasz; "Test"','role':'PLC','group':'Robotyk'}],
          'projects':[{'id':'j1','name':"=NieFormuła",'shortName':'A','topicNumber':'0012','description':'Pierwsza linia\nDruga; z tabulatorem\t!','color':'#347c68'}],
          'assignments':[{'id':'a1','person':'p1','project':'j1','start':'2026-10-22','end':'2027-01-02','load':75,'note':"'cytat"}],
          'calendarDisplay':{'label':'topicNumber','unit':'weeks','showLoad':False},
          'calendarFilters':{'project':['j1'],'person':['p1'],'group':'group:robotyk'}}

    def test_full_roundtrip_csv_and_txt(self):
        for ext in ['.csv','.txt']:
            with self.subTest(ext=ext):
                self.assertEqual(loads(dumps(self.plan,ext),ext), self.plan)

    def test_disk_bom_and_excel_columns(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'plan.csv';atomic_write(p,json.dumps(self.plan))
            self.assertTrue(p.read_bytes().startswith(b'\xef\xbb\xbf'))
            rows=list(csv.DictReader(io.StringIO(p.read_text(encoding='utf-8-sig')),delimiter=';'))
            a=next(r for r in rows if r['Typ']=='PRZYPISANIE')
            self.assertEqual(a['Osoba'],'Łukasz; "Test"')
            self.assertEqual(a['Nr_tematu'],'0012')
            self.assertEqual(a['Projekt'],"'=NieFormuła")
            self.assertEqual(a['Zaangazowanie_proc'],'75')

    def test_excel_comma_delimiter(self):
        original=dumps(self.plan,'.csv');rows=list(csv.reader(io.StringIO(original),delimiter=';'))
        out=io.StringIO();csv.writer(out,delimiter=',').writerows(rows)
        self.assertEqual(loads(out.getvalue(),'.csv'),self.plan)

    def test_legacy_json(self):
        self.assertEqual(loads(json.dumps(self.plan),'.json'),self.plan)

    def test_bad_table_rejected(self):
        with self.assertRaises(ValueError): loads('Osoba;Data\nJan;2026-01-01','.csv')
        with self.assertRaises(ValueError): loads(dumps(self.plan,'.csv').replace('PLAN_ZESPOLU_1','PLAN_ZESPOLU_99'),'.csv')

    def test_excel_modified_assignment(self):
        text=dumps(self.plan,'.csv').replace('2026-10-22','2026-10-23')
        self.assertEqual(loads(text,'.csv')['assignments'][0]['start'],'2026-10-23')

    def test_all_person_fields_in_both_formats(self):
        self.plan['people'].append({'id':'p2','name':'Anna','role':'Elektryk','group':'Serwis'})
        for ext,delimiter in [('.csv',';'),('.txt','\t')]:
            with self.subTest(ext=ext):
                text=dumps(self.plan,ext)
                rows=list(csv.DictReader(io.StringIO(text),delimiter=delimiter))
                people=[r for r in rows if r['Typ']=='OSOBA']
                self.assertEqual([(r['ID'],r['Nazwa'],r['Specjalizacja'],r['Grupa']) for r in people],
                    [('p1','Łukasz; "Test"','PLC','Robotyk'),('p2','Anna','Elektryk','Serwis')])
                a=next(r for r in rows if r['Typ']=='PRZYPISANIE')
                self.assertEqual((a['Specjalizacja'],a['Grupa']),('PLC','Robotyk'))
                self.assertEqual(loads(text,ext)['people'],self.plan['people'])

    def test_specialization_selection_saved(self):
        for selected in [[],['spec:plc','spec:robotyk'],['__none__']]:
            self.plan['calendarFilters']['specialization']=selected
            for ext in ['.csv','.txt']:
                self.assertEqual(loads(dumps(self.plan,ext),ext),self.plan)
