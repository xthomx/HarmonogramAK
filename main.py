"""Plan zespolu — Windows desktop host. UI stays local, files chosen by user."""
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import uuid
from plan_format import dumps, loads
import xlsx_format
from preferences import Preferences
from app_version import APP_VERSION
from updates import check_updates, RELEASES_URL

MAX_BYTES = 5_000_000


def parse_plan(text):
    if not isinstance(text, str) or len(text.encode('utf-8')) > MAX_BYTES:
        raise ValueError('Plik przekracza 5 MB.')
    data = json.loads(text)
    if not isinstance(data, dict) or any(not isinstance(data.get(k), list) for k in ('people', 'projects', 'assignments')):
        raise ValueError('Nieprawidlowy plik planu.')
    return data


def atomic_write(path, text):
    """Replace only after a complete write; failure keeps the previous file."""
    data = parse_plan(text)
    path = Path(path)
    if path.suffix.lower() not in ('.xlsx','.csv','.txt'):
        raise ValueError('Wybierz rozszerzenie .xlsx, .csv albo .txt.')
    payload = xlsx_format.dumps(data) if path.suffix.lower() == '.xlsx' else dumps(data, path.suffix.lower()).encode('utf-8-sig')
    if len(payload) > MAX_BYTES:
        raise ValueError('Plan przekracza 5 MB.')
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(mode='wb', dir=path.parent,
                                         prefix='.plan-', suffix='.tmp', delete=False) as f:
            tmp = Path(f.name)
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except PermissionError as exc:
        raise PermissionError('Nie można zapisać pliku. Zamknij go w Excelu i sprawdź uprawnienia do folderu.') from exc
    finally:
        if tmp and tmp.exists():
            tmp.unlink()


class Api:
    def __init__(self, preferences_path=None):
        self._window = None
        self._path = None
        self._pending = None
        self._lock = threading.Lock()
        self._preferences = Preferences(preferences_path)

    def get_preferences(self):
        return self._preferences.get()

    def set_theme(self, theme):
        self._preferences.update(theme=theme)
        return True

    def _remember_path(self, path):
        try:
            self._preferences.update(last_file=str(Path(path).resolve()))
            return ''
        except OSError:
            return 'Nie udało się zapamiętać ścieżki pliku na następne uruchomienie.'

    def _prepare_open(self, path):
        if path.suffix.lower() not in ('.xlsx', '.csv', '.txt', '.json'):
            raise ValueError('Nieobsługiwany format pliku.')
        with path.open('rb') as f:
            raw = f.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError('Plik przekracza 5 MB.')
        data = xlsx_format.loads(raw) if path.suffix.lower() == '.xlsx' else loads(raw.decode('utf-8-sig'), path.suffix.lower())
        text = json.dumps(data, ensure_ascii=False)
        parse_plan(text)
        token = uuid.uuid4().hex
        self._pending = (token, path)
        return {'token': token, 'name': path.name, 'path': str(path.resolve()), 'text': text,
                'format': path.suffix.lower()[1:] if path.suffix.lower() in ('.xlsx', '.csv', '.txt') else 'xlsx'}

    def restore_last_plan(self):
        with self._lock:
            path = self._preferences.get()['last_file']
            if not path:
                return None
            try:
                return self._prepare_open(Path(path))
            except (OSError, ValueError, UnicodeError, KeyError) as exc:
                return {'error': 'Nie można otworzyć ostatniego pliku: ' + str(exc)}

    def get_version(self):
        return APP_VERSION

    def check_updates(self):
        # pywebview executes API calls outside the UI thread.
        return check_updates()

    def open_updates_page(self):
        import webbrowser
        if not webbrowser.open(RELEASES_URL):
            raise RuntimeError('Nie udało się otworzyć przeglądarki. Wejdź na github.com/xthomx/HarmonogramAK/releases.')
        return True

    def can_close(self):
        """Never block the UI while a file operation owns the lock."""
        if not self._lock.acquire(blocking=False):
            return False
        self._lock.release()
        return True

    def open_plan(self):
        import webview
        with self._lock:
            paths = self._window.create_file_dialog(webview.FileDialog.OPEN, allow_multiple=False,
                                                    file_types=('Plany (*.xlsx;*.csv;*.txt;*.json)',))
            if not paths:
                return None
            path = Path(paths[0] if isinstance(paths, (list, tuple)) else paths)
            return self._prepare_open(path)

    def accept_open(self, token):
        with self._lock:
            if not self._pending or self._pending[0] != token:
                raise ValueError('Nieaktualna operacja otwierania.')
            self._path = self._pending[1]
            self._pending = None
            self._remember_path(self._path)
            return True

    def save_plan(self, text, as_new=False, file_format="xlsx"):
        import webview
        parse_plan(text)
        if file_format not in ('xlsx','csv','txt'): raise ValueError('Nieprawidłowy format zapisu.')
        extension = '.' + file_format
        with self._lock:
            path = self._path
            if as_new or path is None or path.suffix.lower()!=extension:
                paths = self._window.create_file_dialog(webview.FileDialog.SAVE,
                    save_filename=path.stem+extension if path else 'plan-zespolu'+extension,
                    directory=str(path.parent) if path else '',
                    file_types=({'xlsx': 'Excel (*.xlsx)', 'csv': 'CSV (*.csv)', 'txt': 'Tekst tabelaryczny (*.txt)'}[file_format],))
                if not paths:
                    return None
                path = Path(paths[0] if isinstance(paths, (tuple, list)) else paths)
                if path.suffix.lower() != extension:
                    path = path.with_suffix(extension)
                # Explicitly covers extension-appending and native-dialog differences.
                if path.exists() and not self._window.create_confirmation_dialog(
                        'Zapis pliku', 'Zastąpić istniejący plik: ' + path.name + '?'):
                    return None
            atomic_write(path, text)
            self._path = path
            warning = self._remember_path(path)
            return {'name': path.name, 'path': str(path.resolve()), 'warning': warning}


def main():
    import webview
    root = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent)) / 'ui'
    html = (root / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (root / 'style.css').read_text(encoding='utf-8') + '</style>')
    for script in ('report_model.js', 'app.js', 'workspace.js'):
        html = html.replace('<script src="' + script + '"></script>', '<script>' + (root / script).read_text(encoding='utf-8') + '</script>')

    api = Api()
    window = webview.create_window('Plan zespołu', html=html, js_api=api,
        width=1400, height=900, min_size=(900, 600), maximized=True, text_select=True,
        confirm_close=True,
        localization={'global.quitConfirmation':
            'Zamknąć Plan zespołu? Niezapisane zmiany zostaną utracone. '
            'Wybierz Nie, aby wrócić i zapisać plan.'})
    api._window = window

    # The close event must never wait for JavaScript or call a UI API.
    # Native confirmation is displayed by the backend after this handler returns.
    window.events.closing += api.can_close
    webview.start(gui='edgechromium', private_mode=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback
        log = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'PlanZespolu'
        log.mkdir(parents=True, exist_ok=True)
        (log / 'blad.log').write_text(traceback.format_exc(), encoding='utf-8')
        if sys.platform == 'win32':
            import ctypes
            ctypes.windll.user32.MessageBoxW(0,
                'Nie udało się uruchomić programu. Sprawdź instalację Microsoft Edge WebView2 Runtime.\nSzczegóły: ' + str(log / 'blad.log'),
                'Plan zespołu', 16)
        raise

