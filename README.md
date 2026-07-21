# Cube Chess 512 Engine Starter

Niezależny od renderowania starter silnika szachów 8×8×8 w TypeScript.

## Stan

Zawiera:
- współrzędne 3D i notację `L4:e5`,
- planszę 512 pól,
- wieżę, gońca, hetmana, króla, skoczka,
- eksperymentalną regułę piona v0.1,
- wykonywanie ruchów,
- konfigurację przezroczystości warstw Three.js,
- podstawowe testy,
- serię promptów dla Codex.

Jeszcze nie zawiera:
- wykrywania szacha/mata,
- pełnej legalności ruchów,
- roszady i en passant,
- AI,
- integracji z istniejącym repozytorium.

## Uruchomienie

```bash
npm install
npm test
npm run typecheck
```

## Ważna decyzja

Oryginalny projekt `ernest-rudnicki/chess-3d` używa `chess.js`, czyli silnika
wyłącznie 2D. Renderer i modele można zachować, lecz reguły gry oraz AI trzeba
przepiąć na osobny silnik 8×8×8.
