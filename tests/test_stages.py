import copy
import csv
import io
import unittest
from openpyxl import load_workbook
import plan_format
import xlsx_format
from test_formats import Formats

class Stages(unittest.TestCase):
    def setUp(self):
        fixture = Formats()
        fixture.setUp()
        self.plan = fixture.plan

    def test_stage_roundtrip_all_formats(self):
        for stage in ('Offline', 'Uruchomienie'):
            self.plan['assignments'][0]['stage'] = stage
            for ext in ('.csv', '.txt'):
                self.assertEqual(plan_format.loads(plan_format.dumps(self.plan, ext), ext), self.plan)
            self.assertEqual(xlsx_format.loads(xlsx_format.dumps(self.plan)), self.plan)

    def test_legacy_table_without_stage(self):
        for ext, delimiter in (('.csv', ';'), ('.txt', '\t')):
            rows = list(csv.DictReader(io.StringIO(plan_format.dumps(self.plan, ext)), delimiter=delimiter))
            out = io.StringIO()
            writer = csv.DictWriter(out, fieldnames=[k for k in plan_format.FIELDS if k != 'Etap'], delimiter=delimiter)
            writer.writeheader()
            writer.writerows({k:v for k,v in row.items() if k != 'Etap'} for row in rows)
            self.assertEqual(plan_format.loads(out.getvalue(), ext)['assignments'][0]['stage'], 'Offline')

    def workbook_edit(self, edit):
        workbook = load_workbook(io.BytesIO(xlsx_format.dumps(self.plan)))
        edit(workbook['Przypisania'])
        out = io.BytesIO()
        workbook.save(out)
        workbook.close()
        return out.getvalue()

    def test_legacy_excel_without_stage(self):
        raw = self.workbook_edit(lambda sheet: sheet.delete_cols(13))
        self.assertEqual(xlsx_format.loads(raw)['assignments'][0]['stage'], 'Offline')

    def test_excel_stage_edits(self):
        raw = self.workbook_edit(lambda sheet: setattr(sheet['M2'], 'value', 'Uruchomienie'))
        self.assertEqual(xlsx_format.loads(raw)['assignments'][0]['stage'], 'Uruchomienie')
        raw = self.workbook_edit(lambda sheet: setattr(sheet['M2'], 'value', None))
        self.assertEqual(xlsx_format.loads(raw)['assignments'][0]['stage'], 'Offline')

    def test_invalid_stage_rejected(self):
        raw = self.workbook_edit(lambda sheet: setattr(sheet['M2'], 'value', 'Nieznany'))
        with self.assertRaises(ValueError):
            xlsx_format.loads(raw)
        self.plan['assignments'][0]['stage'] = 'Nieznany'
        with self.assertRaises(ValueError):
            plan_format.dumps(self.plan, '.csv')

    def test_missing_stage_export_defaults_without_mutation(self):
        del self.plan['assignments'][0]['stage']
        before = copy.deepcopy(self.plan)
        result = xlsx_format.loads(xlsx_format.dumps(self.plan))
        self.assertEqual(result['assignments'][0]['stage'], 'Offline')
        self.assertEqual(self.plan, before)
