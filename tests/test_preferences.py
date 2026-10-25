import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from main import Api, atomic_write
from preferences import Preferences

PLAN = json.dumps({'people': [], 'projects': [], 'assignments': []})

class PreferenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'preferences.ini'

    def test_defaults_and_corrupt_file(self):
        prefs = Preferences(self.path)
        self.assertEqual(prefs.get(), {'theme':'light', 'last_file':''})
        self.path.write_text('not ini', encoding='utf-8')
        self.assertEqual(prefs.get()['theme'], 'light')

    def test_theme_and_path_preserve_each_other(self):
        prefs = Preferences(self.path)
        name = str(Path(self.tmp.name) / 'Łukasz 100%.xlsx')
        prefs.update(last_file=name)
        prefs.update(theme='dark')
        self.assertEqual(Preferences(self.path).get(), {'theme':'dark', 'last_file':name})
        with self.assertRaises(ValueError): prefs.update(theme='unknown')

    def test_atomic_failure_preserves_preferences(self):
        prefs = Preferences(self.path)
        prefs.update(theme='dark')
        with patch('preferences.os.replace', side_effect=OSError('disk full')):
            with self.assertRaises(OSError): prefs.update(theme='light')
        self.assertEqual(prefs.get()['theme'], 'dark')
        self.assertEqual(list(self.path.parent.iterdir()), [self.path])

    def test_restore_requires_accept_before_setting_current_file(self):
        file = Path(self.tmp.name) / 'plan.xlsx'
        atomic_write(file, PLAN)
        api = Api(self.path)
        api._preferences.update(last_file=str(file))
        result = api.restore_last_plan()
        self.assertIsNone(api._path)
        self.assertEqual(result['name'], 'plan.xlsx')
        self.assertEqual(result['path'], str(file.resolve()))
        api.accept_open(result['token'])
        self.assertEqual(api._path, file)
        self.assertEqual(Api(self.path).restore_last_plan()['name'], 'plan.xlsx')

    def test_missing_and_invalid_file_keep_remembered_path(self):
        file = Path(self.tmp.name) / 'missing.xlsx'
        api = Api(self.path)
        api._preferences.update(last_file=str(file))
        self.assertIn('error', api.restore_last_plan())
        self.assertEqual(api.get_preferences()['last_file'], str(file))
        self.assertIsNone(api._path)
        file.write_bytes(b'not excel')
        self.assertIn('error', api.restore_last_plan())

    def test_successful_save_remembers_path_failed_save_does_not(self):
        file = Path(self.tmp.name) / 'plan.csv'
        atomic_write(file, PLAN)
        api = Api(self.path)
        api._path = file
        with patch.dict('sys.modules', {'webview': object()}):
            api.save_plan(PLAN, file_format='csv')
            self.assertEqual(api.get_preferences()['last_file'], str(file.resolve()))
            other = Path(self.tmp.name) / 'other.csv'
            api._path = other
            with patch('main.atomic_write', side_effect=OSError('disk full')):
                with self.assertRaises(OSError): api.save_plan(PLAN, file_format='csv')
            self.assertEqual(api.get_preferences()['last_file'], str(file.resolve()))
