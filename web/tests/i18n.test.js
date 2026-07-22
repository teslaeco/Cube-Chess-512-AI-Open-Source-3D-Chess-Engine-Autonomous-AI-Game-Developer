import { describe, expect, it } from "vitest";
import {
  ENGLISH_CATALOG,
  LOCALE_META,
  detectInitialLocale,
  getCatalog,
  getLocaleMeta,
  resolveLocale,
  translate,
} from "../i18n/locales.js";

describe("global locale catalogs", () => {
  it("includes every required launch locale and Palestine Arabic", () => {
    expect(LOCALE_META).toHaveLength(38);
    expect(LOCALE_META.map((locale) => locale.tag)).toContain("ar-PS");
    expect(getLocaleMeta("ar-PS")).toMatchObject({ direction: "rtl" });
  });

  it("provides every UI key for every locale through a materialized catalog", () => {
    const requiredKeys = Object.keys(ENGLISH_CATALOG);
    for (const locale of LOCALE_META) {
      const catalog = getCatalog(locale.tag);
      expect(requiredKeys.every((key) => typeof catalog[key] === "string" && catalog[key].length > 0)).toBe(true);
    }
  });

  it("uses exact locale, base language and English fallback order", () => {
    expect(resolveLocale("ar-PS")).toBe("ar-PS");
    expect(resolveLocale("pl-PL")).toBe("pl");
    expect(resolveLocale("xx-Unknown")).toBe("en");
    expect(detectInitialLocale(null, ["xx", "ja-JP"])).toBe("ja");
  });

  it("never exposes a technical translation key for known UI text", () => {
    expect(translate("ar-PS", "newGame")).not.toBe("newGame");
    expect(translate("pl", "minutes", { count: 30 })).toContain("30");
  });
});
