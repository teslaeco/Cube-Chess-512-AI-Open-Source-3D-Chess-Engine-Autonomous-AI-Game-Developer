# Architektura płatności Cube Chess 512

## Zasada główna

Silnik gry, ranking i walidacja ruchów są oddzielone od płatności. Brak płatności nie blokuje podstawowej rozgrywki. Zakupy nie mogą wpływać na legalność ruchów ani dawać przewagi rankingowej.

## Planowana integracja

1. Klient pobiera z backendu katalog produktów i ceny.
2. Backend tworzy sesję płatności u operatora.
3. Użytkownik płaci na stronie lub w natywnym formularzu operatora.
4. Operator wysyła podpisany webhook do backendu.
5. Backend weryfikuje podpis, zapisuje transakcję i przyznaje uprawnienie.
6. Klient pobiera aktualny stan uprawnień.

Klient nigdy nie może sam przyznawać premium na podstawie przekierowania po płatności.

## Dane

Tabela `products`: identyfikator, nazwa, opis, typ, aktywność.

Tabela `prices`: produkt, waluta, kwota w najmniejszej jednostce, okres rozliczeniowy, identyfikator ceny operatora.

Tabela `payments`: użytkownik, operator, identyfikator transakcji, status, kwota, waluta, daty i metadane księgowe.

Tabela `entitlements`: użytkownik, uprawnienie, źródło, data rozpoczęcia, data końca i status.

Tabela `webhook_events`: identyfikator zdarzenia, operator, skrót treści, wynik przetwarzania. Zapewnia idempotencję.

## Bezpieczeństwo

- klucze prywatne wyłącznie w sekretach backendu;
- podpisane webhooki i ochrona przed powtórzeniem;
- idempotentne przetwarzanie zdarzeń;
- żadnych pełnych danych kart w bazie projektu;
- oddzielne środowiska testowe i produkcyjne;
- rejestrowanie zmian uprawnień;
- ręczna procedura zwrotów i sporów;
- ograniczenia wieku i kraju dla funkcji regulowanych.

## Platformy

Wersja webowa może korzystać z operatora płatności podłączonego później do rachunku bankowego. W aplikacjach iOS, Android, Xbox, PlayStation i Steam należy stosować zasady płatności i zakupów danej platformy, jeśli wymagają one ich własnego systemu rozliczeń.

## Konfiguracja późniejsza

Do wdrożenia produkcyjnego potrzebne będą sekrety, np. `PAYMENT_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET` i identyfikatory cen. Nie wolno dodawać ich do repozytorium.

## Moduł wpisowego

Ewentualne rozgrywki z wpisowym muszą pozostać osobnym, domyślnie wyłączonym modułem. Wymagają analizy prawnej dla każdego kraju, weryfikacji wieku, geolokalizacji, KYC/AML, odpowiedzialnej gry i właściwych licencji. Podstawowa gra nie zakłada tego modelu.
