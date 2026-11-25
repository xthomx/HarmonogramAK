import io
import unittest
from openpyxl import load_workbook
import schedule_export


def payload(**over):
    base = {
        'start': '2026-11-02', 'end': '2026-11-15', 'layout': 'days',
        'filters': {'projects': 'LP-2', 'group': 'Serwis'},
        'people': [{'id': 'p1', 'name': 'Nowak Jan', 'group': 'Serwis', 'role': 'PLC'},
                   {'id': 'p2', 'name': '=Zuk Anna', 'group': 'Serwis', 'role': ''}],
        'projects': [{'id': 'j1', 'name': 'Linia pakująca', 'shortName': 'LP-2', 'topicNumber': '25-0142', 'color': '#347c68'},
                     {'id': 'j2', 'name': 'Hala', 'shortName': 'H', 'topicNumber': '', 'color': '#587fba'}],
        'assignments': [
            {'person': 'p1', 'project': 'j1', 'start': '2026-10-28', 'end': '2026-11-04', 'load': 100, 'stage': 'Uruchomienie', 'note': 'Ważne'},
            {'person': 'p1', 'project': 'j2', 'start': '2026-11-04', 'end': '2026-11-05', 'load': 50, 'stage': 'Offline', 'note': ''},
            {'person': 'p2', 'project': 'j2', 'start': '2026-11-09', 'end': '2026-11-10', 'load': 60, 'stage': 'Offline', 'note': ''}]}
    base.update(over)
    return base


def open_book(data):
    return load_workbook(io.BytesIO(data))


class ScheduleExport(unittest.TestCase):
    def test_days_layout_cells_and_tasks_sheet(self):
        wb = open_book(schedule_export.build(payload()))
        self.assertEqual(wb.sheetnames, ['Harmonogram', 'Zadania'])
        s = wb['Harmonogram']
        self.assertEqual(s['A8'].value, 'Nowak Jan')
        self.assertEqual(s['A9'].value, '=Zuk Anna')  # tekst, nie formuła
        self.assertEqual(s['A9'].data_type, 's')
        first_day = 4  # kolumna D = 2026-11-02
        self.assertEqual(s.cell(8, first_day).value, 'LP-2')
        self.assertTrue(s.cell(8, first_day).font.bold)  # Uruchomienie
        self.assertEqual(s.cell(8, first_day + 2).value, '! LP-2 / H')  # 4 listopada: 100% + 50%
        self.assertEqual(s.cell(8, first_day + 3).value, 'H 50%')
        self.assertEqual(s.cell(9, first_day + 7).value, 'H 60%')
        self.assertIsNone(s.cell(8, first_day + 6).value)
        t = wb['Zadania']
        self.assertEqual(t.max_row, 4)
        self.assertEqual(t['L2'].value, 3)  # 2–4 listopada w okresie
        self.assertEqual(t['G2'].value.date().isoformat(), '2026-10-28')

    def test_overload_is_marked(self):
        p = payload()
        p['assignments'].append({'person': 'p1', 'project': 'j2', 'start': '2026-11-02', 'end': '2026-11-02', 'load': 100, 'stage': 'Offline', 'note': ''})
        s = open_book(schedule_export.build(p))['Harmonogram']
        self.assertTrue(s.cell(8, 4).value.startswith('! '))

    def test_weeks_layout(self):
        s = open_book(schedule_export.build(payload(layout='weeks')))['Harmonogram']
        self.assertEqual(s['D6'].value, 'tydz. 45')
        self.assertEqual(s['D7'].value, '02.11')
        self.assertEqual(s['D8'].value, '! LP-2 / H')
        self.assertIsNone(s['D9'].value)
        self.assertEqual(s['E9'].value, 'H')

    def test_validation(self):
        for bad in (payload(start='2026-13-01'), payload(end='2026-10-01'), payload(layout='x'), payload(people=[]),
                    payload(start='2025-01-01', end='2026-12-31'),
                    payload(assignments=[{'person': 'zz', 'project': 'j1', 'start': '2026-11-02', 'end': '2026-11-03', 'load': 100}]),
                    payload(assignments=[{'person': 'p1', 'project': 'j1', 'start': '2026-11-02', 'end': '2026-11-03', 'load': 0}])):
            with self.assertRaises(ValueError):
                schedule_export.build(bad)
        with self.assertRaises(ValueError):
            schedule_export.build('nie słownik')


if __name__ == '__main__':
    unittest.main()
