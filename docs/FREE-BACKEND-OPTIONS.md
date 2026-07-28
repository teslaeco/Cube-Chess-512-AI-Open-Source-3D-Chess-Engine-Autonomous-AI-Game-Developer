# Darmowy backend dla Cube Chess 512

GitHub Pages publikuje wyłącznie statyczny frontend. Nie uruchamia procesu Node.js, WebSocketów, bazy danych ani bezpiecznego systemu kont.

## Rekomendowany start

Dla wersji edukacyjnej i otwartoźródłowej najprostszy układ to:

- GitHub Pages — frontend gry;
- Supabase Free — użytkownicy, logowanie e-mail, reset hasła, PostgreSQL i dane profilu;
- Render Free lub podobna usługa — autorytatywny serwer WebSocket rozgrywki;
- GitHub Actions — testy i automatyczne wdrożenia.

## GitHub Education

Zweryfikowani studenci mogą otrzymać oferty partnerów GitHub Student Developer Pack, między innymi kredyty chmurowe. Dostęp zależy od statusu studenta i aktualnych warunków partnerów.

## Zasada bezpieczeństwa

Hasła nie mogą być przechowywane w GitHub Pages, repozytorium ani localStorage. Backend powinien używać bezpiecznych sesji HTTP-only, weryfikacji e-maila, limitów prób, ochrony CSRF i silnego haszowania haseł.
