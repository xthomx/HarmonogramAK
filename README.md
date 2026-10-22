# HarmonogramAK

Plan zespołu dla Windows: kalendarz przydziałów, filtry osób, tematów, grup i specjalizacji oraz zapis XLSX/CSV/TXT.

## Uruchomienie
Uruchom `URUCHOM.bat` lub zbuduj EXE przez `ZBUDUJ_EXE.bat`. Szczegóły w `INSTRUKCJA.txt`.

## Automatyczne budowanie
Każdy push uruchamia testy i budowę Windows. Gotowy ZIP znajdziesz w Actions → Windows EXE → zakończone uruchomienie → Artifacts. Przechowywany jest przez 30 dni.

Aby opublikować numerowane wydanie po sprawdzeniu zmian:

```sh
git tag v1.0.0
git push origin v1.0.0
```

Workflow publikuje paczkę w Releases po pomyślnych testach i kompilacji. Dla następnego wydania użyj nowego numeru. Nie twórz wcześniej pustego wydania ręcznie.

GitHub buduje na Windows 2022 z Python 3.12 x64 niezależnie od wersji Pythona na Twoim komputerze. Paczka zawiera cały folder programu, w tym _internal. Zachowaj ten folder w całości. Wymagany WebView2 Runtime.

## Aktualizacje
Zapisz dane i zamknij program. Rozpakuj nową wersję do nowego folderu i otwórz swój plan. Pliki danych trzymaj poza folderem aplikacji i repozytorium. Automatyczna instalacja aktualizacji w aplikacji nie jest jeszcze zaimplementowana.

Zmiany z rozmowy ChatGPT muszą zostać przesłane do repozytorium, aby rozpoczęła się budowa. Testy automatyczne nie zastępują sprawdzenia interfejsu Windows.
