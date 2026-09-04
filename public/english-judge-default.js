(() => {
  "use strict";

  const MIGRATION_KEY = "cubeChessEnglishDefaultMigration";
  const MIGRATION_VERSION = "20260904-judge-en-v1";

  // Older builds selected the browser language automatically. That meant a
  // Polish browser could reopen the public judge path in Polish even though
  // the document and authentication screen were already English. Migrate once
  // to an English default; after this one-time migration, an explicit language
  // choice made in Settings remains under the user's control.
  try {
    if (localStorage.getItem(MIGRATION_KEY) !== MIGRATION_VERSION) {
      localStorage.setItem("cubeChessLanguage", "en");
      localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
    }
  } catch {
    // The game still starts in a storage-restricted browser. GamePresentation
    // receives English through navigator.languages below only when available.
  }

  document.documentElement.lang = "en";

  // These three names are historical raw defaults outside the translation
  // catalogue. Translate only exact generated defaults; never rewrite names
  // typed by a player.
  const RAW_DEFAULTS = new Map([
    ["Gracz 1", "Player 1"],
    ["Gracz 2", "Player 2"],
    ["Gracz online", "Online player"],
  ]);

  function translated(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!RAW_DEFAULTS.has(trimmed)) return value;
    return value.replace(trimmed, RAW_DEFAULTS.get(trimmed));
  }

  function translateElement(element) {
    if (!(element instanceof Element)) return;

    if (element instanceof HTMLInputElement) {
      const nextValue = translated(element.value);
      if (nextValue !== element.value) {
        element.value = nextValue;
        element.defaultValue = nextValue;
      }
    }

    for (const attribute of ["value", "placeholder", "aria-label", "title"]) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const next = translated(current);
      if (next !== current) element.setAttribute(attribute, next);
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const next = translated(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (
      root.nodeType !== Node.ELEMENT_NODE &&
      root.nodeType !== Node.DOCUMENT_NODE &&
      root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
    ) return;

    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const next = translated(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      } else {
        translateElement(node);
      }
      node = walker.nextNode();
    }
  }

  function start() {
    translateTree(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target);
        if (mutation.type === "attributes") translateElement(mutation.target);
        for (const node of mutation.addedNodes) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value", "placeholder", "aria-label", "title"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
