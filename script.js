/* === SCRIPT ORIGINAL (inchangé) === */

/* Helpers */
function qs(sel, root = document) {
  return root.querySelector(sel);
}
function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* FAQ accordion */
function initFaq() {
  const items = qsa(".faq-item");
  if (!items.length) return;

  items.forEach((item) => {
    const btn = qs(".faq-q", item);
    if (!btn) return;
    btn.addEventListener("click", () => {
      item.classList.toggle("open");
    });
  });
}

/* =========================
   RSS / Actualités récentes
   ========================= */
async function loadRssNews() {
  const grid = document.getElementById("rssGrid");
  if (!grid) return;

  const escapeHtml = (str) =>
    String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Removes HTML tags that can appear in RSS titles/descriptions (ex: <b>ChatGPT</b>)
  const stripHtml = (val) => {
    if (val == null) return "";
    if (typeof val !== "string") val = String(val);
    return val.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const normalizeUrl = (url) => {
    if (!url) return "";
    const u = String(url).trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    // Some feeds may provide relative URLs; ignore them rather than breaking navigation
    return "";
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getDomain = (url) => {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  const renderItem = (item) => {
    const link = normalizeUrl(item?.link);
    const title = stripHtml(item?.title);
    const description = stripHtml(item?.description);
    const source = stripHtml(item?.source) || getDomain(link);
    const date = formatDate(item?.publishedAt || item?.date);

    const card = document.createElement("article");
    card.className = "rss-card";
    card.tabIndex = 0;

    const titleEl = document.createElement("h3");
    titleEl.className = "rss-card-title";
    titleEl.innerHTML = escapeHtml(title);

    const metaEl = document.createElement("div");
    metaEl.className = "rss-meta";
    metaEl.textContent = [date, source].filter(Boolean).join(" • ");

    const descEl = document.createElement("p");
    descEl.className = "rss-desc";
    descEl.textContent = description;

    const linkEl = document.createElement("a");
    linkEl.className = "rss-link";
    linkEl.href = link || "#";
    linkEl.target = "_blank";
    linkEl.rel = "noopener noreferrer";
    linkEl.textContent = "Lire l'article";

    if (!link) {
      linkEl.setAttribute("aria-disabled", "true");
      linkEl.classList.add("is-disabled");
    } else {
      // Whole card clickable
      card.addEventListener("click", (e) => {
        if (e.target && e.target.closest && e.target.closest("a")) return;
        window.open(link, "_blank", "noopener,noreferrer");
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.open(link, "_blank", "noopener,noreferrer");
        }
      });
    }

    card.appendChild(titleEl);
    if (metaEl.textContent) card.appendChild(metaEl);
    if (description) card.appendChild(descEl);
    card.appendChild(linkEl);

    return card;
  };

  try {
    // Cache-bust to avoid GitHub Pages cache
    const res = await fetch(`./data/news.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = Array.isArray(data?.items) ? data.items : [];
    grid.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "rss-empty";
      empty.textContent = "Aucune actualité disponible pour le moment.";
      grid.appendChild(empty);
      return;
    }

    const sorted = [...items].sort((a, b) => {
      const da = new Date(a?.publishedAt || a?.date || 0).getTime();
      const db = new Date(b?.publishedAt || b?.date || 0).getTime();
      return db - da;
    });

    sorted.slice(0, 12).forEach((it) => grid.appendChild(renderItem(it)));
  } catch (err) {
    grid.innerHTML = "";
    const error = document.createElement("div");
    error.className = "rss-empty";
    error.textContent = "Impossible de charger les actualités pour le moment.";
    grid.appendChild(error);
    console.error(err);
  }
}

/* Init */
document.addEventListener("DOMContentLoaded", () => {
  initFaq();
  loadRssNews();
});
