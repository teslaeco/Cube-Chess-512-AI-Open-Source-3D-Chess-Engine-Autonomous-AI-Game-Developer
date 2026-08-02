const SESSION_STORAGE_KEY = "cubeChessSupabaseSession";

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
  return ["general", "rules", "bugs", "ideas", "tournaments"].includes(value)
    ? value
    : "general";
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

class ForumApi {
  headers(prefer = "return=representation") {
    const anon = supabaseAnonKey();
    const token = storedAccessToken();
    if (!anon || !token) throw new Error("Brak aktywnej sesji konta.");
    return {
      apikey: anon,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer,
    };
  }

  async request(path, options = {}) {
    const base = supabaseUrl();
    if (!base) throw new Error("Forum nie ma skonfigurowanego backendu Supabase.");
    const response = await fetch(`${base}/rest/v1/${path}`, {
      ...options,
      headers: { ...this.headers(options.prefer), ...options.headers },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(body?.message || body?.hint || "Operacja forum nie powiodła się.");
    return body;
  }

  listTopics() {
    return this.request("forum_topics?select=id,title,category,author_name,created_at,reply_count&order=created_at.desc&limit=50", { method: "GET" });
  }

  createTopic(topic) {
    return this.request("forum_topics", {
      method: "POST",
      body: JSON.stringify(topic),
    });
  }
}

export class ForumPanel {
  constructor(root, getIdentity) {
    this.root = root;
    this.getIdentity = getIdentity;
    this.api = new ForumApi();
    this.observer = new MutationObserver(() => this.refresh());
    this.observer.observe(root, { childList: true, subtree: true, attributes: true });
    this.handleSubmit = (event) => void this.submit(event);
    root.addEventListener("submit", this.handleSubmit);
    this.refresh();
  }

  setIdentity(identity) {
    this.identity = identity;
    this.refresh(true);
  }

  isHelpOpen() {
    return this.root.querySelector('[data-panel="help"].active') != null;
  }

  refresh(force = false) {
    if (!this.isHelpOpen()) return;
    const panel = this.root.querySelector("[data-menu-panel]");
    if (!panel) return;
    let forum = panel.querySelector("[data-community-forum]");
    if (!forum) {
      forum = document.createElement("section");
      forum.className = "community-forum";
      forum.dataset.communityForum = "";
      panel.append(forum);
      force = true;
    }
    if (!force && forum.dataset.renderedMode === (this.currentIdentity()?.mode || "none")) return;
    this.render(forum);
  }

  currentIdentity() {
    return this.identity ?? this.getIdentity?.() ?? null;
  }

  render(container) {
    const identity = this.currentIdentity();
    const account = canAccessForum(identity);
    container.dataset.renderedMode = identity?.mode || "none";
    if (!account) {
      container.innerHTML = `
        <div class="forum-heading"><span>07</span><div><h2>Forum społeczności</h2><p>Dyskusje o zasadach, błędach, pomysłach i turniejach Cube Chess 512.</p></div></div>
        <div class="forum-locked" role="status">
          <strong>Forum jest dostępne wyłącznie dla zalogowanych użytkowników.</strong>
          <p>Tryb gościa nie może czytać ani publikować tematów. Zaloguj się na konto, aby wejść do społeczności.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="forum-heading"><span>07</span><div><h2>Forum społeczności</h2><p>Zalogowano jako ${escapeHtml(identity.displayName || "Gracz")}.</p></div></div>
      <form class="forum-topic-form" data-forum-topic-form>
        <label>Tytuł tematu<input name="title" minlength="4" maxlength="120" required></label>
        <label>Kategoria<select name="category">
          <option value="general">Ogólne</option><option value="rules">Zasady gry</option>
          <option value="bugs">Błędy</option><option value="ideas">Pomysły</option>
          <option value="tournaments">Turnieje</option>
        </select></label>
        <label>Treść<textarea name="body" minlength="10" maxlength="5000" required></textarea></label>
        <button class="primary-action" type="submit">Utwórz temat</button>
      </form>
      <p class="forum-status" data-forum-status aria-live="polite">Ładowanie tematów…</p>
      <div class="forum-topic-list" data-forum-topic-list></div>`;
    void this.loadTopics(container);
  }

  async loadTopics(container = this.root.querySelector("[data-community-forum]")) {
    if (!container || !canAccessForum(this.currentIdentity())) return;
    const status = container.querySelector("[data-forum-status]");
    const list = container.querySelector("[data-forum-topic-list]");
    try {
      const topics = await this.api.listTopics();
      status.textContent = topics.length ? `${topics.length} najnowszych tematów` : "Nie ma jeszcze tematów. Załóż pierwszy.";
      list.innerHTML = topics.map((topic) => `
        <article class="forum-topic">
          <div><span class="forum-category">${escapeHtml(forumCategory(topic.category))}</span><h3>${escapeHtml(topic.title)}</h3></div>
          <p>Autor: ${escapeHtml(topic.author_name || "Gracz")} · odpowiedzi: ${Number(topic.reply_count) || 0}</p>
        </article>`).join("");
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Nie udało się pobrać forum.";
      status.setAttribute("role", "alert");
    }
  }

  async submit(event) {
    const form = event.target.closest("[data-forum-topic-form]");
    if (!form) return;
    event.preventDefault();
    const identity = this.currentIdentity();
    if (!canAccessForum(identity)) return;
    const status = form.parentElement.querySelector("[data-forum-status]");
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = "Publikowanie tematu…";
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
      await this.loadTopics(form.parentElement);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Nie udało się opublikować tematu.";
      status.setAttribute("role", "alert");
    } finally {
      submit.disabled = false;
    }
  }

  dispose() {
    this.observer.disconnect();
    this.root.removeEventListener("submit", this.handleSubmit);
  }
}
