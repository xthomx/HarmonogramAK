import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch
from main import Api, atomic_write, parse_plan
from plan_format import loads, dumps

PLAN = json.dumps({'people': [{'id': 'p1', 'name': 'Łukasz'}], 'projects': [], 'assignments': []}, ensure_ascii=False)

class FileTests(unittest.TestCase):
    def test_roundtrip_unicode(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'plan.csv'
            atomic_write(path, PLAN)
            self.assertEqual(loads(path.read_text(encoding='utf-8-sig'), '.csv')['people'][0]['name'], 'Łukasz')

    def test_failed_replace_preserves_old_file(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'plan.csv'
            path.write_text('old', encoding='utf-8')
            with patch('main.os.replace', side_effect=OSError('disk error')):
                with self.assertRaises(OSError):
                    atomic_write(path, PLAN)
            self.assertEqual(path.read_text(), 'old')
            self.assertEqual(len(list(Path(d).iterdir())), 1)

    def test_invalid_data_does_not_replace_file(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'plan.csv'
            path.write_text('old')
            with self.assertRaises(ValueError):
                atomic_write(path, '{}')
            self.assertEqual(path.read_text(), 'old')

    def test_open_commit_and_save_cancellation(self):
        module = types.SimpleNamespace(FileDialog=types.SimpleNamespace(OPEN=1, SAVE=2))
        with tempfile.TemporaryDirectory() as d, patch.dict('sys.modules', {'webview': module}):
            path = Path(d) / 'plan.csv'
            atomic_write(path, PLAN)
            api = Api()
            api._window = types.SimpleNamespace(create_file_dialog=lambda *a, **k: [str(path)])
            result = api.open_plan()
            self.assertIsNone(api._path)
            api.accept_open(result['token'])
            self.assertEqual(api._path, path)
            saved = api.save_plan(PLAN, file_format='csv')
            self.assertEqual(saved['name'], 'plan.csv')
            api._window.create_file_dialog = lambda *a, **k: None
            self.assertIsNone(api.save_plan(PLAN, True, 'csv'))
            self.assertEqual(api._path, path)

    def test_declining_overwrite_keeps_target(self):
        module = types.SimpleNamespace(FileDialog=types.SimpleNamespace(OPEN=1, SAVE=2))
        with tempfile.TemporaryDirectory() as d, patch.dict('sys.modules', {'webview': module}):
            path = Path(d) / 'other.csv'
            path.write_text('old')
            api = Api()
            api._window = types.SimpleNamespace(create_file_dialog=lambda *a, **k: str(path),
                create_confirmation_dialog=lambda *a: False)
            self.assertIsNone(api.save_plan(PLAN, True, 'csv'))
            self.assertEqual(path.read_text(), 'old')
            self.assertIsNone(api._path)

if __name__ == '__main__':
    unittest.main()
