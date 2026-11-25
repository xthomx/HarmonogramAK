"""Eksport wybranego fragmentu harmonogramu do pliku Excel (.xlsx) — tylko do odczytu/raportowania."""
import io
import re
from datetime import date, timedelta
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

MAX_DAYS = 366
MAX_PEOPLE = 2000
MAX_ASSIGNMENTS = 20000
WEEKDAYS = ['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd']
MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
HEADER_FILL = PatternFill('solid', fgColor='286553')
WEEKEND_FILL = PatternFill('solid', fgColor='E4E8EE')
FREE_FILL = PatternFill('solid', fgColor='FFFFFF')
THIN = Side(style='thin', color='C9D1DA')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
DARK = '1B2735'


def _date(value, name):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError('Nieprawidłowa data: ' + name + '.')


def _text(value, limit=250):
    return str(value if value is not None else '')[:limit]


def _tint(color, amount=0.45):
    """Rozjaśnia kolor projektu, aby ciemny tekst był czytelny."""
    if not isinstance(color, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        color = '#788391'
    rgb = [int(color[i:i + 2], 16) for i in (1, 3, 5)]
    return ''.join('%02X' % round(c + (255 - c) * amount) for c in rgb)


def _label(project):
    return _text(project.get('shortName') or project.get('topicNumber') or project.get('name'), 40)


def _put(sheet, row, col, value, text=True):
    cell = sheet.cell(row, col)
    cell.value = value
    if text and isinstance(value, str):
        cell.data_type = 's'  # Dosłowny tekst — także gdy zaczyna się od „=”.
    return cell


def validate(payload):
    if not isinstance(payload, dict):
        raise ValueError('Nieprawidłowe dane eksportu.')
    start, end = _date(payload.get('start'), 'od'), _date(payload.get('end'), 'do')
    if end < start:
        raise ValueError('Data „do” nie może być wcześniejsza niż „od”.')
    if (end - start).days + 1 > MAX_DAYS:
        raise ValueError('Wybierz okres nie dłuższy niż 366 dni.')
    if payload.get('layout') not in ('days', 'weeks'):
        raise ValueError('Nieprawidłowy układ kolumn.')
    people, projects, assignments = (payload.get(k) for k in ('people', 'projects', 'assignments'))
    if not all(isinstance(x, list) for x in (people, projects, assignments)):
        raise ValueError('Nieprawidłowe dane eksportu.')
    if len(people) > MAX_PEOPLE or len(assignments) > MAX_ASSIGNMENTS:
        raise ValueError('Zbyt dużo danych do eksportu. Zawęź wybór.')
    if not people:
        raise ValueError('Brak osób do wyeksportowania.')
    ids = {p.get('id') for p in people if isinstance(p, dict)}
    pids = {p.get('id') for p in projects if isinstance(p, dict)}
    for a in assignments:
        if not isinstance(a, dict) or a.get('person') not in ids or a.get('project') not in pids:
            raise ValueError('Przypisanie wskazuje nieistniejącą osobę lub projekt.')
        _date(a.get('start'), 'przypisania'), _date(a.get('end'), 'przypisania')
        if isinstance(a.get('load'), bool) or not isinstance(a.get('load'), (int, float)) or not 0 < a['load'] <= 100:
            raise ValueError('Nieprawidłowe zaangażowanie w przypisaniu.')
    if any(not isinstance(p, dict) or not p.get('id') for p in people + projects):
        raise ValueError('Nieprawidłowe dane eksportu.')
    return start, end


def _week_starts(start, end):
    first = start - timedelta(days=start.weekday())
    out, cur = [], first
    while cur <= end:
        out.append(cur)
        cur += timedelta(days=7)
    return out


def build(payload):
    start, end = validate(payload)
    layout = payload['layout']
    people, assignments = payload['people'], payload['assignments']
    projects = {p['id']: p for p in payload['projects']}
    by_person = {}
    for a in assignments:
        by_person.setdefault(a['person'], []).append(a)

    wb = Workbook()
    sheet = wb.active
    sheet.title = 'Harmonogram'
    ncols_head = 3
    if layout == 'days':
        columns = [(start + timedelta(days=i), start + timedelta(days=i)) for i in range((end - start).days + 1)]
    else:
        columns = [(max(w, start), min(w + timedelta(days=6), end)) for w in _week_starts(start, end)]

    _put(sheet, 1, 1, 'Harmonogram zespołu').font = Font(bold=True, size=15)
    _put(sheet, 2, 1, 'Okres: %s – %s' % (start.isoformat(), end.isoformat()))
    filters = payload.get('filters') or {}
    desc = '; '.join(label + ': ' + _text(filters.get(key), 300) for key, label in
                     (('projects', 'Projekty'), ('persons', 'Osoby'), ('group', 'Grupa')) if filters.get(key)) or 'bez filtrów (wszystkie dane z okresu)'
    _put(sheet, 3, 1, 'Wybór: ' + desc)

    head_row = 7
    for i, title in enumerate(('Osoba', 'Grupa', 'Specjalizacja'), 1):
        sheet.merge_cells(start_row=5, start_column=i, end_row=head_row, end_column=i)
        c = _put(sheet, 5, i, title)
        c.font, c.fill = Font(bold=True, color='FFFFFF'), HEADER_FILL
        c.alignment = Alignment(vertical='center')
    # Nagłówki kolumn: miesiąc (scalany), dzień tygodnia / numer tygodnia, dzień / data początku.
    month_start = None
    for idx, (a, b) in enumerate(columns):
        col = ncols_head + 1 + idx
        key = (a.year, a.month)
        if key != month_start:
            month_start = key
            span = sum(1 for x, _ in columns if (x.year, x.month) == key)
            if span > 1:
                sheet.merge_cells(start_row=5, start_column=col, end_row=5, end_column=col + span - 1)
            _put(sheet, 5, col, '%s %d' % (MONTHS[a.month - 1], a.year))
        if layout == 'days':
            _put(sheet, 6, col, WEEKDAYS[a.weekday()])
            _put(sheet, 7, col, a.day, text=False)
        else:
            _put(sheet, 6, col, 'tydz. %d' % a.isocalendar()[1])
            _put(sheet, 7, col, a.strftime('%d.%m'))
    for row in (5, 6, 7):
        for idx in range(len(columns)):
            c = sheet.cell(row, ncols_head + 1 + idx)
            c.font, c.fill = Font(bold=True, color='FFFFFF'), HEADER_FILL
            c.alignment = Alignment(horizontal='center', vertical='center')

    used = {}
    row = head_row + 1
    for person in people:
        tasks = by_person.get(person['id'], [])
        for i, value in enumerate((person.get('name'), person.get('group'), person.get('role')), 1):
            c = _put(sheet, row, i, _text(value, 100))
            c.font, c.border = Font(bold=(i == 1)), BORDER
        for idx, (a, b) in enumerate(columns):
            cell = sheet.cell(row, ncols_head + 1 + idx)
            cell.border = BORDER
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=(layout == 'weeks'), shrink_to_fit=(layout == 'days'))
            cell.font = Font(size=8 if layout == 'days' else 9, color=DARK)
            cell.fill = WEEKEND_FILL if layout == 'days' and a.weekday() >= 5 else FREE_FILL
            active = [t for t in tasks if date.fromisoformat(t['start']) <= b and date.fromisoformat(t['end']) >= a]
            if not active:
                continue
            peak = max(sum(t['load'] for t in active if date.fromisoformat(t['start']) <= a + timedelta(days=d) <= date.fromisoformat(t['end']))
                       for d in range((b - a).days + 1))
            names = []
            for t in active:
                label = _label(projects[t['project']])
                if label not in names:
                    names.append(label)
                used[t['project']] = projects[t['project']]
            text = ' / '.join(names)
            if layout == 'days' and len(active) == 1 and active[0]['load'] < 100:
                text += ' %d%%' % active[0]['load']
            overload = peak > 100
            if overload:
                text = '! ' + text
            cell.value = text
            cell.data_type = 's'
            cell.fill = PatternFill('solid', fgColor=_tint(projects[active[0]['project']].get('color')))
            cell.font = Font(size=8 if layout == 'days' else 9, color='A4261C' if overload else DARK,
                             bold=overload or any(t.get('stage') == 'Uruchomienie' for t in active))
        row += 1
    last_row = row - 1
    for idx in range(len(columns)):
        sheet.column_dimensions[get_column_letter(ncols_head + 1 + idx)].width = 6.2 if layout == 'days' else 16
    for letter, width in (('A', 26), ('B', 16), ('C', 18)):
        sheet.column_dimensions[letter].width = width
    sheet.freeze_panes = sheet.cell(head_row + 1, ncols_head + 1)

    # Legenda.
    row = last_row + 2
    _put(sheet, row, 1, 'Legenda').font = Font(bold=True)
    for p in sorted(used.values(), key=lambda p: (_text(p.get('topicNumber')), _label(p))):
        row += 1
        swatch = sheet.cell(row, 1)
        swatch.fill = PatternFill('solid', fgColor=_tint(p.get('color')))
        swatch.border = BORDER
        _put(sheet, row, 1, _label(p))
        _put(sheet, row, 2, ' · '.join(x for x in (_text(p.get('topicNumber')), _text(p.get('name'), 120)) if x))
    for note in ('Pogrubienie — etap „Uruchomienie” (bez pogrubienia: „Offline”).',
                 'Czerwony tekst z „!” — obciążenie osoby powyżej 100%.' + (' W układzie tygodniowym liczone jest najwyższe obciążenie dnia.' if layout == 'weeks' else ''),
                 'Szare tło — weekend. Procent obok skrótu — zaangażowanie poniżej 100%.' if layout == 'days' else 'Szczegóły zadań (daty, procenty, notatki) są w arkuszu „Zadania”.'):
        row += 1
        _put(sheet, row, 1, note).font = Font(italic=True, color='5E6B7B')

    sheet.page_setup.orientation = 'landscape'
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.print_title_rows = '5:7'

    # Arkusz z listą zadań.
    tasks_sheet = wb.create_sheet('Zadania')
    headers = ['Osoba', 'Grupa', 'Specjalizacja', 'Nr tematu', 'Skrót projektu', 'Projekt', 'Od', 'Do', 'Zaangażowanie %', 'Etap', 'Notatka', 'Dni w okresie']
    for i, title in enumerate(headers, 1):
        c = _put(tasks_sheet, 1, i, title)
        c.font, c.fill = Font(bold=True, color='FFFFFF'), HEADER_FILL
        tasks_sheet.column_dimensions[get_column_letter(i)].width = (26, 16, 18, 14, 16, 34, 12, 12, 16, 14, 40, 14)[i - 1]
    row = 2
    for person in people:
        for t in sorted(by_person.get(person['id'], []), key=lambda t: (t['start'], t['end'])):
            s, e = date.fromisoformat(t['start']), date.fromisoformat(t['end'])
            if e < start or s > end:
                continue
            project = projects[t['project']]
            for i, value in enumerate((person.get('name'), person.get('group'), person.get('role'), project.get('topicNumber'), project.get('shortName'), project.get('name')), 1):
                _put(tasks_sheet, row, i, _text(value, 200))
            tasks_sheet.cell(row, 7).value, tasks_sheet.cell(row, 7).number_format = s, 'yyyy-mm-dd'
            tasks_sheet.cell(row, 8).value, tasks_sheet.cell(row, 8).number_format = e, 'yyyy-mm-dd'
            tasks_sheet.cell(row, 9).value = int(t['load'])
            _put(tasks_sheet, row, 10, _text(t.get('stage') or 'Offline', 20))
            _put(tasks_sheet, row, 11, _text(t.get('note'), 250))
            tasks_sheet.cell(row, 12).value = (min(e, end) - max(s, start)).days + 1
            row += 1
    tasks_sheet.freeze_panes = 'A2'
    tasks_sheet.auto_filter.ref = 'A1:%s%d' % (get_column_letter(len(headers)), max(row - 1, 1))

    out = io.BytesIO()
    wb.save(out)
    wb.close()
    return out.getvalue()
