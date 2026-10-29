"""Validation of optional vehicles and exclusive project reservations."""
from datetime import date


def validate(plan):
    cars, reservations = plan.get('cars', []), plan.get('carReservations', [])
    for key, items in [('cars', cars), ('carReservations', reservations)]:
        if not isinstance(items, list) or len(items) > 10000 or any(not isinstance(x, dict) or not isinstance(x.get('id'), str) or not x['id'].strip() for x in items):
            raise ValueError('Nieprawidłowa lista: ' + key)
        if len({x['id'] for x in items}) != len(items):
            raise ValueError('Powtórzone ID: ' + key)
    by_id = {x['id']: x for x in cars}
    plates = set()
    for car in cars:
        if not isinstance(car.get('name'), str) or not car['name'].strip():
            raise ValueError('Wpisz nazwę samochodu.')
        plate = car.get('plate', '')
        if not isinstance(plate, str) or not plate.strip():
            raise ValueError('Wpisz numer rejestracyjny.')
        plate = ''.join(plate.upper().split())
        if plate in plates:
            raise ValueError('Powtórzony numer rejestracyjny.')
        plates.add(plate)
        if type(car.get('seats')) is not int or not 1 <= car['seats'] <= 100:
            raise ValueError('Liczba miejsc musi wynosić od 1 do 100 (łącznie z kierowcą).')
        if car.get('usage') not in ('Sekcyjne', 'Indywidualne') or not isinstance(car.get('owner', ''), str):
            raise ValueError('Nieprawidłowy typ lub użytkownik samochodu.')
    projects = {x['id'] for x in plan['projects']}
    by_car = {}
    for booking in reservations:
        car = by_id.get(booking.get('car'))
        if car is None or booking.get('project') not in projects:
            raise ValueError('Rezerwacja wskazuje nieistniejący samochód lub projekt.')
        try:
            start, end = [date.fromisoformat(booking[k]) for k in ('start', 'end')]
            if start.isoformat() != booking['start'] or end.isoformat() != booking['end'] or start > end:
                raise ValueError()
        except (KeyError, TypeError, ValueError):
            raise ValueError('Nieprawidłowe daty rezerwacji.')
        if type(booking.get('passengers')) is not int or not 1 <= booking['passengers'] <= car['seats']:
            raise ValueError('Liczba osób w rezerwacji przekracza liczbę miejsc lub jest nieprawidłowa.')
        if not isinstance(booking.get('note', ''), str):
            raise ValueError('Nieprawidłowa notatka rezerwacji.')
        by_car.setdefault(car['id'], []).append(booking)
    for bookings in by_car.values():
        ordered = sorted(bookings, key=lambda x: x['start'])
        for previous, following in zip(ordered, ordered[1:]):
            if following['start'] <= previous['end']:
                raise ValueError('Nakładające się rezerwacje tego samego samochodu.')
