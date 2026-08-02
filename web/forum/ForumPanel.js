const SESSION_STORAGE_KEY = "cubeChessSupabaseSession";
const FORUM_HASH = "#forum";
const CATEGORIES = [
  ["general", "Ogólne", "Rozmowy społeczności Cube Chess 512"],
  ["rules", "Zasady gry", "Pytania i wyjaśnienia zasad szachów 3D"],
  ["bugs", "Błędy", "Zgłoszenia problemów technicznych"],
  ["ideas", "Pomysły", "Propozycje nowych funkcji i ulepszeń"],
  ["tournaments", "Turnieje", "Rozgrywki, wydarzenia i rankingi"],
];

function supabaseUrl() {
  return String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
}

function supabaseAnonKey() {
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
}

export function canAccessForum(identity) {
  return identity?.mode === "account" && Boolean(identity.playerId);
}

export function forumCategory(value) {
  return CATEGORIES.some(([key]) => key === value) ? value : "general";
}

function categoryLabel(value) {
  return CATEGORIES.find(([key]) => key === value)?.[1] ?? "Ogólne";
}

function storedAccessToken() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null")?.accessToken || "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

class ForumApi {
  headers(prefer = "return=representation") {
    const anon = supabaseAnonKey();
    const token = storedAccessToken();
    if (!anon || !token) throw new Error("Sesja logowania wygasła. Zaloguj się ponownie.");
    return {
      apikey: anon,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer,
    };
  }

  async request(path, options = {}) {
    const base = supabaseUrl();
    if (!base) throw new Error("Backend forum nie jest skonfigurowany.");
    const response = await fetch(`${base}/rest/v1/${path}`, {
      ...options,
      headers: { ...this.headers(options.prefer), ...options.headers },
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const message = body?.message || body?.hint || `Błąd forum (${response.status}).`;
      throw new Error(message);
    }
    return body;
  }

  listTopics(category = "all", query = "") {
    const filters = [
      "select=id,title,category,author_name,body,created_at,updated_at,reply_count",
      "order=updated_at.desc",
      "limit=100",
    ];
    if (category !== "all") filters.push(`category=eq.${encodeURIComponent(forumCategory(category))}`);
    if (query.trim()) filters.push(`or=(title.ilike.*${encodeURIComponent(query.trim())}*,body.ilike.*${encodeURIComponent(query.trim())}*)`);
    return this.request(`forum_topics?${filters.join("&")}`, { method: "GET" });
  }

  createTopic(topic) {
    return this.request("forum_topics", { method: "POST", body: JSON.stringify(topic) });
  }
}

export class ForumPanel {
  constructor(root, getIdentity) {
    this.root = root;
    this.getIdentity = getIdentity;
    this.api = new ForumApi();
    this.identity = null;
    this.activeCategory = "all";
    this.searchQuery = "";
    this.page = document.createElement("section");
    this.page.className = "forum-page";
    this.page.dataset.forumPage = "";
    this.page.hidden = true;
    document.body.append(this.page);

    this.handleClick = (event) => void this.onClick(event);
    this.handleSubmit = (event) => void this.onSubmit(event);
    this.handleInput = (event) => this.onInput(event);
    this.handleHashChange = () => this.syncRoute();
    document.addEventListener("click", this.handleClick);
    document.addEventListener("submit", this.handleSubmit);
    document.addEventListener("input", this.handleInput);
    window.addEventListener("hashchange", this.handleHashChange);

    this.observer = new MutationObserver(() => this.injectHelpCard());
    this.observer.observe(root, { childList: true, subtree: true, attributes: true });
    this.injectHelpCard();
    this.syncRoute();
  }

  setIdentity(identity) {
    this.identity = identity;
    this.injectHelpCard(true);
    if (!this.page.hidden) this.renderPage();
  }

  currentIdentity() {
    return this.identity ?? this.getIdentity?.() ?? null;
  }

  injectHelpCard(force = false) {
    if (!this.root.querySelector('[data-panel="help"].active')) return;
    const panel = this.root.querySelector("[data-menu-panel]");
    if (!panel) return;
    let card = panel.querySelector("[data-community-forum]");
    if (!card) {
      card = document.createElement("section");
      card.className = "community-forum forum-entry-card";
      card.dataset.communityForum = "";
      panel.append(card);
      force = true;
    }
    const mode = this.currentIdentity()?.mode || "none";
    if (!force && card.dataset.renderedMode === mode) return;
    card.dataset.renderedMode = mode;
    const account = canAccessForum(this.currentIdentity());
    card.innerHTML = `
      <div class="forum-entry-icon" aria-hidden="true">💬</div>
      <div class="forum-entry-copy">
        <h2>Forum społeczności</h2>
        <p>Osobna przestrzeń dyskusji o zasadach, błędach, pomysłach i turniejach.</p>
        <small>${account ? "Dostęp aktywny dla Twojego konta." : "Zaloguj się na konto, aby czytać i publikować."}</small>
      </div>
      <button class="primary-action" type="button" data-open-forum>${account ? "Przejdź do forum" : "Otwórz forum"} →</button>`;
  }

  syncRoute() {
    const open = location.hash === FORUM_HASH;
    this.page.hidden = !open;
    document.documentElement.classList.toggle("forum-route-open", open);
    if (open) this.renderPage();
  }

  renderPage() {
    const identity = this.currentIdentity();
    const account = canAccessForum(identity);
    this.page.innerHTML = `
      <header class="forum-topbar">
        <button type="button" class="forum-brand" data-close-forum aria-label="Wróć do gry">
          <span class="forum-brand-cube">512</span><span><strong>Cube Chess Forum</strong><small>Społeczność graczy i twórców</small></span>
        </button>
        <label class="forum-search">⌕<input data-forum-search value="${escapeHtml(this.searchQuery)}" placeholder="Szukaj tematów"></label>
        <div class="forum-user"><span>${escapeHtml(identity?.displayName || "Gość")}</span><button type="button" data-close-forum>Wróć do gry</button></div>
      </header>
      <div class="forum-layout">
        <aside class="forum-sidebar">
          <button class="forum-new-topic" type="button" data-new-topic ${account ? "" : "disabled"}>+ Nowy temat</button>
          <nav aria-label="Kategorie forum">
            <button data-forum-category="all" class="${this.activeCategory === "all" ? "active" : ""}"><span>⌂</span><strong>Wszystkie tematy</strong></button>
            ${CATEGORIES.map(([key, label]) => `<button data-forum-category="${key}" class="${this.activeCategory === key ? "active" : ""}"><span>${key === "bugs" ? "⚠" : key === "ideas" ? "✦" : key === "rules" ? "♟" : key === "tournaments" ? "🏆" : "#"}</span><strong>${label}</strong></button>`).join("")}
          </nav>
          <section class="forum-sidebar-note"><strong>Zasady społeczności</strong><p>Szanuj innych, opisuj błędy dokładnie i nie publikuj danych prywatnych.</p></section>
        </aside>
        <main class="forum-content">
          <section class="forum-hero">
            <div><p class="eyebrow">CUBE CHESS 512 AI</p><h1>Forum społeczności</h1><p>Wymieniaj pomysły, zgłaszaj błędy i rozwijaj z nami szachy 8×8×8.</p></div>
            ${account ? `<button type="button" data-new-topic>Utwórz temat</button>` : `<div class="forum-login-warning"><strong>Wymagane logowanie</strong><span>Wróć do gry i zaloguj się na konto.</span></div>`}
          </section>
          <section class="forum-category-cards">
            ${CATEGORIES.map(([key, label, description]) => `<button type="button" data-forum-category="${key}"><span>${label}</span><small>${description}</small></button>`).join("")}
          </section>
          <section class="forum-feed">
            <header><div><h2>${this.activeCategory === "all" ? "Najnowsze dyskusje" : categoryLabel(this.activeCategory)}</h2><p data-forum-status aria-live="polite">Ładowanie tematów…</p></div><select data-forum-sort aria-label="Sortowanie"><option>Najnowsze</option></select></header>
            <div data-forum-topic-list class="forum-topic-list"></div>
          </section>
        </main>
      </div>
      <dialog class="forum-composer" data-forum-composer>
        <form method="dialog" class="forum-composer-card" data-forum-topic-form>
          <header><div><p class="eyebrow">NOWA DYSKUSJA</p><h2>Utwórz temat</h2></div><button type="button" data-close-composer aria-label="Zamknij">×</button></header>
          <label>Tytuł<input name="title" minlength="4" maxlength="120" required placeholder="Krótki i konkretny tytuł"></label>
          <label>Kategoria<select name="category">${CATEGORIES.map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></label>
          <label>Treść<textarea name="body" minlength="10" maxlength="5000" required placeholder="Opisz temat, pytanie lub problem..."></textarea></label>
          <p data-composer-status aria-live="polite"></p>
          <footer><button type="button" data-close-composer>Anuluj</button><button class="primary-action" type="submit">Opublikuj temat</button></footer>
        </form>
      </dialog>`;
    if (account) void this.loadTopics();
    else this.renderLockedFeed();
  }

  renderLockedFeed() {
    const status = this.page.querySelector("[data-forum-status]");
    const list = this.page.querySelector("[data-forum-topic-list]");
    if (status) status.textContent = "Forum jest dostępne po zalogowaniu.";
    if (list) list.innerHTML = `<div class="forum-empty"><span>🔒</span><h3>Zaloguj się, aby wejść do społeczności</h3><p>Tryb gościa nie może czytać ani publikować tematów.</p><button type="button" data-close-forum>Wróć do logowania</button></div>`;
  }

  async loadTopics() {
    const status = this.page.querySelector("[data-forum-status]");
    const list = this.page.querySelector("[data-forum-topic-list]");
    if (!status || !list || !canAccessForum(this.currentIdentity())) return;
    status.textContent = "Ładowanie tematów…";
    try {
      const topics = await this.api.listTopics(this.activeCategory, this.searchQuery);
      status.textContent = topics.length ? `${topics.length} tematów` : "Brak tematów w tej kategorii.";
      list.innerHTML = topics.length ? topics.map((topic) => `
        <article class="forum-topic-row">
          <div class="forum-topic-avatar">${escapeHtml((topic.author_name || "G").charAt(0).toUpperCase())}</div>
          <div class="forum-topic-main"><span class="forum-category">${escapeHtml(categoryLabel(topic.category))}</span><h3>${escapeHtml(topic.title)}</h3><p>${escapeHtml(String(topic.body || "").slice(0, 180))}${String(topic.body || "").length > 180 ? "…" : ""}</p><small>${escapeHtml(topic.author_name || "Gracz")} · ${formatDate(topic.updated_at || topic.created_at)}</small></div>
          <div class="forum-topic-stats"><strong>${Number(topic.reply_count) || 0}</strong><span>odpowiedzi</span></div>
        </article>`).join("") : `<div class="forum-empty"><span>💬</span><h3>Nie ma jeszcze tematów</h3><p>Rozpocznij pierwszą dyskusję w tej kategorii.</p><button type="button" data-new-topic>Utwórz temat</button></div>`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Nie udało się pobrać forum.";
      list.innerHTML = `<div class="forum-empty error"><span>⚠</span><h3>Forum nie może połączyć się z bazą</h3><p>${escapeHtml(status.textContent)}</p><button type="button" data-retry-forum>Spróbuj ponownie</button></div>`;
    }
  }

  async onClick(event) {
    const target = event.target.closest("button, [data-open-forum]");
    if (!target) return;
    if (target.matches("[data-open-forum]")) location.hash = FORUM_HASH;
    if (target.matches("[data-close-forum]")) history.pushState(null, "", location.pathname + location.search);
    if (target.matches("[data-close-forum]")) this.syncRoute();
    if (target.matches("[data-forum-category]")) {
      this.activeCategory = target.dataset.forumCategory;
      this.renderPage();
    }
    if (target.matches("[data-new-topic]")) this.page.querySelector("[data-forum-composer]")?.showModal();
    if (target.matches("[data-close-composer]")) this.page.querySelector("[data-forum-composer]")?.close();
    if (target.matches("[data-retry-forum]")) await this.loadTopics();
  }

  onInput(event) {
    if (!event.target.matches("[data-forum-search]")) return;
    this.searchQuery = event.target.value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadTopics(), 300);
  }

  async onSubmit(event) {
    const form = event.target.closest("[data-forum-topic-form]");
    if (!form) return;
    event.preventDefault();
    const identity = this.currentIdentity();
    if (!canAccessForum(identity)) return;
    const status = form.querySelector("[data-composer-status]");
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = "Publikowanie…";
    try {
      const data = new FormData(form);
      await this.api.createTopic({
        author_id: identity.playerId,
        author_name: identity.displayName || "Gracz",
        title: String(data.get("title") || "").trim(),
        category: forumCategory(String(data.get("category") || "general")),
        body: String(data.get("body") || "").trim(),
      });
      form.reset();
      form.closest("dialog")?.close();
      await this.loadTopics();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Nie udało się opublikować tematu.";
      status.setAttribute("role", "alert");
    } finally {
      submit.disabled = false;
    }
  }

  dispose() {
    clearTimeout(this.searchTimer);
    this.observer.disconnect();
    document.removeEventListener("click", this.handleClick);
    document.removeEventListener("submit", this.handleSubmit);
    document.removeEventListener("input", this.handleInput);
    window.removeEventListener("hashchange", this.handleHashChange);
    this.page.remove();
  }
}
