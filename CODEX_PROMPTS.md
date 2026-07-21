# Prompty dla Codex — Cube Chess 512

## Prompt 1 — audyt i przygotowanie forka

Pracujesz jako senior TypeScript/Three.js engineer. Bazą jest fork repozytorium
`ernest-rudnicki/chess-3d`, licencja MIT. Najpierw uruchom testy, build oraz wersję
developerską. Nie zmieniaj grafiki ani UI przed zakończeniem audytu.

Cele:
1. Zidentyfikuj wszystkie miejsca zależne od `chess.js`.
2. Zidentyfikuj model danych planszy 8x8, pozycje figur, raycasting, AI web worker,
   historię ruchów i zapis stanu.
3. Utwórz `docs/ARCHITECTURE_AUDIT.md` z mapą zależności.
4. Zaproponuj plan usunięcia `chess.js`, ponieważ nie obsługuje 8x8x8.
5. Nie implementuj jeszcze ruchów. Jeden commit: `docs: audit 2D chess architecture`.

Kryteria akceptacji:
- oryginalna gra nadal się buduje,
- dokument wymienia konkretne pliki i klasy,
- brak zmian behawioralnych.

## Prompt 2 — wprowadzenie niezależnego silnika 8×8×8

Dodaj pakiet domenowy `src/engine3d`, niezależny od Three.js i DOM. Wykorzystaj
interfejsy z dostarczonego startera `cube-chess-512-engine`.

Wymagania:
- współrzędne `x,y,z` w zakresie 0..7,
- 512 pól,
- adres tekstowy `L4:e5`,
- niezmienny stan pozycji,
- Map<string, Piece>,
- generowanie pseudo-legalnych ruchów,
- wykonywanie i cofanie ruchu,
- testy Vitest,
- zero importów z Three.js w silniku.

Nie podłączaj jeszcze renderera. Commit:
`feat(engine): add independent 8x8x8 board domain`.

## Prompt 3 — pełne ruchy przestrzenne

Zaimplementuj ruchy wariantu Cube Chess 512:

- wieża: dowolna odległość wzdłuż jednej z trzech osi,
- goniec: dowolna odległość po przekątnej zmieniającej dokładnie dwie lub trzy osie,
- hetman: suma ruchów wieży i gońca,
- król: jedno pole w dowolnym z 26 kierunków,
- skoczek: permutacje wektora `(±2, ±1, 0)`,
- figury ślizgowe nie mogą przeskakiwać innych figur,
- nie można bić własnej figury.

Piony pozostaw za flagą eksperymentalną `pawnRuleVersion: "v0.1"` i dokładnie opisz
regułę w `docs/RULES.md`. Dodaj testy środka, krawędzi, blokady i bicia.
Commit: `feat(engine): implement spatial piece movement`.

## Prompt 4 — szach, legalność, mat i pat

Rozszerz silnik o:
- mapę atakowanych pól,
- wykrywanie szacha,
- filtrowanie ruchów pozostawiających własnego króla w szachu,
- mat,
- pat,
- historię pozycji,
- cofanie ruchu,
- licznik półruchów,
- stabilny hash pozycji.

Nie implementuj roszady, en passant ani powtórzeń przed zatwierdzeniem zasad.
Dodaj testy regresyjne. Commit:
`feat(engine): add legal move validation and game termination`.

## Prompt 5 — podłączenie do Three.js i 8 warstw

Usuń zależność logiki gry od `chess.js` i podłącz `engine3d` do istniejącego
renderera. Wygeneruj osiem plansz 8×8 ustawionych pionowo.

Wymagania:
- stały odstęp między warstwami jako jedna konfiguracja,
- każda warstwa ma numer 1..8,
- kliknięcie pola zwraca `Coord3`,
- pionki są zawsze nieprzezroczyste,
- pola i ramy plansz są przezroczyste,
- aktywna warstwa: opacity 0.82,
- sąsiednie: 0.28,
- dalsze: 0.08,
- poza zasięgiem widoczności: 0,
- `depthWrite=false` dla mocno przezroczystych materiałów,
- suwak przezroczystości i wybór aktywnego piętra,
- podświetlenie legalnych ruchów widoczne przez warstwy.

Dodaj testy funkcji wyliczającej opacity oraz test integracyjny wyboru pola.
Commit: `feat(render): add eight transparent interactive board levels`.

## Prompt 6 — AI działające w Web Workerze

Nie używaj `chess.js` w AI. Przepisz web worker na stan `Position`.

Minimalne AI:
- negamax,
- alpha-beta,
- iterative deepening,
- limit czasu,
- kolejność: bicia, szachy, ruchy spokojne,
- ocena materiału i mobilności,
- anulowanie poprzedniego wyszukiwania,
- deterministyczny tryb testowy.

Najpierw głębokość 2–3. Priorytetem jest poprawność i odpowiedź w przeglądarce,
nie siła gry. Dodaj benchmark pozycji startowej.
Commit: `feat(ai): support Cube Chess 512 in web worker`.

## Prompt 7 — wersja webowa i kontrola jakości

Przygotuj deployment Vercel/GitHub Pages:
- produkcyjny build,
- responsywność telefonu,
- wskaźnik tury i piętra,
- restart,
- cofnięcie,
- wybór gracz vs komputer,
- obsługa błędów workera,
- attribution i zachowanie licencji MIT oryginalnego projektu,
- test smoke w Playwright.

Nie dodawaj multiplayera ani kont. Commit:
`release: prepare Cube Chess 512 web MVP`.
