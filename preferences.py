"""Local preferences, independent of plan data."""
import configparser
import os
from pathlib import Path
import tempfile
import threading

class Preferences:
    def __init__(self, path=None):
        self.path = Path(path) if path else Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'PlanZespolu' / 'preferences.ini'
        self.lock = threading.Lock()

    def _read(self):
        parser = configparser.ConfigParser(interpolation=None)
        try:
            with self.path.open(encoding='utf-8') as f:
                parser.read_file(f)
            section = parser['app'] if parser.has_section('app') else {}
            theme = section.get('theme', 'light')
            return {'theme': theme if theme in ('light', 'dark') else 'light', 'last_file': section.get('last_file', '')}
        except (OSError, UnicodeError, configparser.Error):
            return {'theme': 'light', 'last_file': ''}

    def get(self):
        with self.lock:
            return self._read()

    def update(self, **changes):
        if set(changes) - {'theme', 'last_file'}:
            raise ValueError('Nieznane ustawienie.')
        if 'theme' in changes and changes['theme'] not in ('light', 'dark'):
            raise ValueError('Nieprawidłowy motyw.')
        with self.lock:
            values = self._read()
            values.update(changes)
            parser = configparser.ConfigParser(interpolation=None)
            parser['app'] = values
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = None
            try:
                with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.path.parent, prefix='.prefs-', delete=False) as f:
                    tmp = Path(f.name)
                    parser.write(f)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp, self.path)
            finally:
                if tmp and tmp.exists():
                    tmp.unlink()
        return values
