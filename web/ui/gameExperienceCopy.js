const COPY = {
  en: {
    returnToMenu: "Exit to menu",
    confirmReturnToMenu: "Return to the main menu? Your current game and open game panels will close. Unsaved progress will be lost and an online match will disconnect. Previously saved games will remain. Cancel to keep playing.",
    aboutTitle: "About Cube Chess 512 AI",
    aboutP1: "Cube Chess 512 AI brings chess into three dimensions: eight 8×8 boards form one 8×8×8 arena with 512 squares. Plan across levels, explore spatial tactics and learn a different way to see the board.",
    aboutP2: "We are Terraforming Planet, an independent project building chess games, AI tools and interactive 3D experiences. Our focus here is Cube Chess: clear rules, useful computer opponents, responsive controls and distinctive boards and pieces.",
    aboutP3: "We are developing the existing game for browsers, Android and iOS. New updates are coming soon, with improvements to gameplay, AI, performance and the mobile experience.",
    aboutP4: "Cube Chess is actively developed. Planned improvements will be released after testing; this page does not announce a release date or an app-store launch.",
  },
  pl: {
    returnToMenu: "Wyjdź do menu",
    confirmReturnToMenu: "Wrócić do menu głównego? Bieżąca partia i otwarte panele gry zostaną zamknięte. Niezapisane postępy zostaną utracone, a połączenie z partią online zakończone. Wcześniej zapisane partie pozostaną. Wybierz Anuluj, aby grać dalej.",
    aboutTitle: "O Cube Chess 512 AI",
    aboutP1: "Cube Chess 512 AI przenosi szachy w trzy wymiary: osiem plansz 8×8 tworzy jedną arenę 8×8×8 z 512 polami. Planuj ruchy między poziomami, odkrywaj przestrzenną taktykę i spójrz na szachownicę inaczej.",
    aboutP2: "Jesteśmy Terraforming Planet — niezależnym projektem rozwijającym gry szachowe, narzędzia AI i interaktywne doświadczenia 3D. Tutaj skupiamy się na Cube Chess: czytelnych zasadach, komputerowych przeciwnikach, wygodnym sterowaniu oraz własnych planszach i figurach.",
    aboutP3: "Rozwijamy istniejącą grę z myślą o przeglądarkach, Androidzie i iOS. Kolejne aktualizacje będą dostępne wkrótce. Pracujemy nad rozgrywką, AI, wydajnością i wygodą gry na telefonach.",
    aboutP4: "Cube Chess jest stale rozwijane. Planowane usprawnienia udostępnimy po testach; ten opis nie ogłasza daty wydania ani premiery w sklepach z aplikacjami.",
  },
};

/** English is the explicit fallback for copy not yet translated to another locale. */
export function gameExperienceText(language, key) {
  const locale = String(language ?? "en").toLowerCase().split("-")[0];
  return Object.hasOwn(COPY.en, key) ? (COPY[locale] ?? COPY.en)[key] : undefined;
}
