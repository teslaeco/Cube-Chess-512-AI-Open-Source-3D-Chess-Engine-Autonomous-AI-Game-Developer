import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const bootstrap = read("public/english-judge-default.js");
const indexHtml = read("index.html");
const guestHtml = read("guest.html");
const serviceWorker = read("public/sw.js");

function runBootstrap(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const documentElement = { lang: "pl" };
  const context = {
    localStorage: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, String(value));
      },
    },
    document: {
      documentElement,
      readyState: "loading",
      addEventListener() {},
    },
    Element: class {},
    HTMLInputElement: class {},
    Node: {
      TEXT_NODE: 3,
      ELEMENT_NODE: 1,
      DOCUMENT_NODE: 9,
      DOCUMENT_FRAGMENT_NODE: 11,
    },
    NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 },
    MutationObserver: class {},
  };
  vm.runInNewContext(bootstrap, context);
  return { values, documentElement };
}

describe("English Cube judge entry", () => {
  it("migrates an older browser-language choice to English exactly once", () => {
    const first = runBootstrap({ cubeChessLanguage: "pl" });
    expect(first.values.get("cubeChessLanguage")).toBe("en");
    expect(first.values.get("cubeChessEnglishDefaultMigration")).toBe(
      "20260904-judge-en-v1",
    );
    expect(first.documentElement.lang).toBe("en");

    const second = runBootstrap({
      cubeChessLanguage: "pl",
      cubeChessEnglishDefaultMigration: "20260904-judge-en-v1",
    });
    expect(second.values.get("cubeChessLanguage")).toBe("pl");
  });

  it("loads the English bootstrap before the application on both public entries", () => {
    for (const html of [indexHtml, guestHtml]) {
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<script src="./english-judge-default.js"></script>');
      expect(html.indexOf("english-judge-default.js")).toBeLessThan(
        html.indexOf("/web/promotion/bootstrap.js"),
      );
    }
  });

  it("translates only the remaining historical raw player defaults", () => {
    expect(bootstrap).toContain('["Gracz 1", "Player 1"]');
    expect(bootstrap).toContain('["Gracz 2", "Player 2"]');
    expect(bootstrap).toContain('["Gracz online", "Online player"]');
    expect(bootstrap).toContain("never rewrite names");
  });

  it("refreshes the PWA cache and includes the English bootstrap offline", () => {
    expect(serviceWorker).toContain(
      'CACHE_VERSION = "cube-chess-512-v5-english-judge-ui"',
    );
    expect(serviceWorker).toContain('"./english-judge-default.js"');
  });
});
