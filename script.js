document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('header nav ul li a');
    const burgerMenu = document.getElementById('burger-menu');
    const navUL = document.querySelector('header nav ul');
    const yearSpan = document.getElementById('year');
    const header = document.querySelector('header');

    const closeMenu = () => {
        if (navUL && burgerMenu && navUL.classList.contains('active')) {
            navUL.classList.remove('active');
            burgerMenu.classList.remove('toggle');
            burgerMenu.setAttribute('aria-expanded', 'false');
        }
    };

    // Burger menu toggle
    if (burgerMenu && navUL) {
        burgerMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            navUL.classList.toggle('active');
            burgerMenu.classList.toggle('toggle');

            const expanded = navUL.classList.contains('active');
            burgerMenu.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });

        // Fermer le menu si on clique sur un lien
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Fermer le menu si clic en dehors du header
        document.addEventListener('click', (e) => {
            if (navUL.classList.contains('active') && header && !header.contains(e.target)) {
                closeMenu();
            }
        });

        // Fermer au clavier (Escape)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        });
    }

    // Mise Ã  jour automatique de l'annÃ©e dans le footer
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Mettre en Ã©vidence le lien de la page active dans la navigation
    const currentPagePath = window.location.pathname;
    let currentPageName = currentPagePath.substring(currentPagePath.lastIndexOf('/') + 1);
    if (currentPageName === '' || currentPageName === 'index.html') {
        currentPageName = 'index.html';
    }

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (
            linkHref === currentPageName ||
            (currentPageName === 'index.html' && (linkHref === './' || linkHref === 'index.html'))
        ) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // DÃ©filement fluide pour les ancres internes
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // VÃ©rifie que l'ancre existe sur la page actuelle ET que ce n'est pas juste "#"
            if (href && href.length > 1 && document.querySelector(href)) {
                e.preventDefault();

                const targetElement = document.querySelector(href);
                let headerOffset = 70;
                const headerEl = document.querySelector('header');
                if (headerEl) {
                    headerOffset = headerEl.offsetHeight;
                }

                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Menu dynamique - filtres (Mes projets)
    const filters = document.querySelectorAll('.projects-filters .filter-btn');
    const projectCards = document.querySelectorAll('.project-card[data-category]');

    if (filters.length > 0 && projectCards.length > 0) {
        const hideCard = (card) => {
            if (card.classList.contains('hidden')) return;
            card.classList.add('fade-out');
            window.setTimeout(() => {
                card.classList.add('hidden');
                card.classList.remove('fade-out');
            }, 180);
        };

        const showCard = (card) => {
            if (!card.classList.contains('hidden')) return;
            card.classList.remove('hidden');
            card.classList.add('fade-in');
            window.setTimeout(() => {
                card.classList.remove('fade-in');
            }, 220);
        };

        const applyFilter = (value) => {
            filters.forEach(btn => {
                const isActive = btn.dataset.filter === value;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            projectCards.forEach(card => {
                const cat = card.dataset.category || 'projet';
                const shouldShow = (value === 'all') || (cat === value);

                if (shouldShow) {
                    showCard(card);
                } else {
                    hideCard(card);
                }
            });
        };

        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                applyFilter(btn.dataset.filter);
            });
        });

        // Ã‰tat par dÃ©faut
        applyFilter('all');
    }
});

// Veille FAQ accordion
(function initVeilleFaq() {
    const buttons = document.querySelectorAll('.faq-question');
    if (!buttons || buttons.length === 0) return;

    // Ensure a known initial state (CSS also hides answers by default)
    buttons.forEach((b) => {
        const it = b.closest('.faq-item');
        const ans = it ? it.querySelector('.faq-answer') : null;
        if (ans) ans.style.display = 'none';
        b.setAttribute('aria-expanded', 'false');
        if (it) it.classList.remove('open');
    });

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            const item = btn.closest('.faq-item');
            const answer = item ? item.querySelector('.faq-answer') : null;
            if (!item || !answer) return;

            // Close others (accordion behaviour)
            buttons.forEach((b) => {
                if (b === btn) return;
                b.setAttribute('aria-expanded', 'false');
                const otherItem = b.closest('.faq-item');
                const otherAnswer = otherItem ? otherItem.querySelector('.faq-answer') : null;
                if (otherAnswer) otherAnswer.style.display = 'none';
                if (otherItem) otherItem.classList.remove('open');
            });

            const nextExpanded = !expanded;
            btn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
            answer.style.display = nextExpanded ? 'block' : 'none';
            item.classList.toggle('open', nextExpanded);
        });
    });
})();


// Veille - Actualites RSS (data/news.json)
const NEWS_PATH = "./data/news.json";
const DEFAULT_MAX_NEWS_ITEMS = 9;
const DEFAULT_MAX_ALERT_AGE_DAYS = 45;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value ?? "");
    return textarea.value;
}

function normalizeArticleLink(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    if (/^\/\//.test(raw)) return `https:${raw}`;

    if (/^[a-z]+:\/\//i.test(raw)) {
        try {
            const u = new URL(raw);
            if (u.protocol === "http:" || u.protocol === "https:") return u.href;
        } catch (e) {
            return "";
        }
        return "";
    }

    if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) {
        return `https://${raw.replace(/^\/+/, "")}`;
    }

    return "";
}

function formatFrDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR");
}

function hostFromLink(link) {
    if (!link) return "";
    try {
        return new URL(link).hostname.replace(/^www\./i, "").toLowerCase();
    } catch (e) {
        return "";
    }
}

function sourceFromLink(link) {
    const host = hostFromLink(link);
    if (!host) return "";

    const map = new Map([
        ["reuters.com", "Reuters"],
        ["journaldunet.com", "Journal du Net"],
        ["01net.com", "01net"],
        ["clubic.com", "Clubic"],
        ["business-standard.com", "Business Standard"],
        ["euronews.com", "Euronews"],
        ["economiematin.fr", "Économie Matin"],
        ["ouest-france.fr", "Ouest-France"],
        ["geekslands.fr", "Geekslands"],
        ["notebookcheck.biz", "Notebookcheck"],
        ["zonebourse.com", "Zonebourse"],
        ["telegrafi.com", "Telegrafi"],
        ["lebigdata.fr", "LeBigData"],
    ]);

    if (map.has(host)) return map.get(host);

    const root = host.split(".")[0] || "";
    if (!root) return "";
    return root.charAt(0).toUpperCase() + root.slice(1);
}

function cleanRawSource(source) {
    const text = decodeHtmlEntities(source || "").trim();
    if (!text) return "";

    if (/alerte google/i.test(text)) return "Google Alerts";
    if (text.length > 38) return `${text.slice(0, 35).trim()}...`;
    return text;
}

function pickDisplaySource(rawSource, link) {
    return sourceFromLink(link) || cleanRawSource(rawSource) || "Source web";
}

function isRecentDate(value, maxAgeDays) {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;

    const ageMs = Date.now() - d.getTime();
    return ageMs >= 0 && ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function normalizeNewsItem(item) {
    const title = decodeHtmlEntities(item?.title || "Article");
    const link = normalizeArticleLink(item?.link || item?.url || item?.guid || "");
    const publishedAt = item?.publishedAt || item?.date || item?.pubDate || item?.updated || "";
    const description = decodeHtmlEntities(item?.description || item?.excerpt || item?.summary || "");
    const source = pickDisplaySource(item?.source || item?.feedTitle || "", link);

    return { title, link, publishedAt, description, source };
}

function parseNewsPayload(data) {
    const rawItems = Array.isArray(data?.items) ? data.items : [];

    const items = rawItems
        .map(normalizeNewsItem)
        .filter((it) => it.title && (it.link || it.description));

    items.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

    return {
        items,
        sources: Array.isArray(data?.sources) ? data.sources : [],
    };
}

function renderNewsGrid(items) {
    const grid = document.getElementById("rssGrid");
    if (!grid) return;

    if (!items.length) {
        grid.innerHTML = `<div class="rss-loading">Aucune actualité disponible pour le moment.</div>`;
        return;
    }

    grid.innerHTML = items
        .map((it, index) => {
            const title = escapeHtml(it.title || "Article");
            const source = escapeHtml(it.source || "Source inconnue");
            const date = escapeHtml(formatFrDate(it.publishedAt) || "Date indisponible");
            const description = escapeHtml(it.description || "Description indisponible.");
            const href = escapeHtml(it.link || "");

            const titleMarkup = href
                ? `<h3 class="rss-card-title"><a class="rss-link" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a></h3>`
                : `<h3 class="rss-card-title">${title}</h3>`;

            const ctaMarkup = href
                ? `<a class="rss-read-more" href="${href}" target="_blank" rel="noopener noreferrer">Lire l'article <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`
                : `<span class="rss-read-more rss-read-more-disabled">Lien indisponible</span>`;

            return `
          <article class="rss-card rss-card-enhanced" style="--rss-stagger:${index};">
            <div class="rss-card-top">
              <span class="rss-source-chip">${source}</span>
              <span class="rss-date-chip">${date}</span>
            </div>
            ${titleMarkup}
            <p class="rss-desc">${description}</p>
            ${ctaMarkup}
          </article>
        `;
        })
        .join("");
}

function sourceLabel(sourceUrl, index) {
    if (!sourceUrl) return `Flux RSS ${index + 1}`;
    return `Flux RSS ${index + 1}`;
}

function sourceHost(sourceUrl) {
    try {
        const u = new URL(sourceUrl);
        return u.hostname.replace(/^www\./, "");
    } catch (e) {
        return "source-rss";
    }
}

function sourceFeedHint(sourceUrl) {
    try {
        const u = new URL(sourceUrl);
        const parts = u.pathname.split("/").filter(Boolean);
        const short = (value) => {
            const text = String(value || "");
            if (!text) return "";
            if (text.length <= 12) return text;
            return `${text.slice(0, 6)}...${text.slice(-4)}`;
        };

        if (parts.length >= 2) {
            const beforeLast = short(parts[parts.length - 2]);
            const last = short(parts[parts.length - 1]);
            return `${beforeLast} / ${last}`;
        }

        const fallback = `${u.pathname}${u.search}`;
        if (fallback.length <= 36) return fallback;
        return `${fallback.slice(0, 33)}...`;
    } catch (e) {
        return "Flux Google Alerts";
    }
}

function renderSources(sources) {
    const list = document.getElementById("rssSourcesList");
    if (!list) return;

    const safeSources = sources
        .map((url) => normalizeArticleLink(url))
        .filter(Boolean)
        .slice(0, 3);

    if (!safeSources.length) {
        list.innerHTML = "<li>Aucune source RSS configurée.</li>";
        return;
    }

    list.innerHTML = safeSources
        .map(
            (url, index) => `
      <li class="rss-source-item">
        <a class="rss-source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <span class="rss-source-index">${escapeHtml(sourceLabel(url, index))}</span>
          <span class="rss-source-name">${escapeHtml(sourceHost(url))}</span>
          <span class="rss-source-url">${escapeHtml(sourceFeedHint(url))}</span>
          <span class="rss-source-open" aria-hidden="true"><i class="fas fa-arrow-up-right-from-square"></i></span>
        </a>
      </li>
    `
        )
        .join("");
}

function alertItemMarkup(item) {
    const title = escapeHtml(item.title || "Article");
    const source = escapeHtml(item.source || "Source");
    const date = escapeHtml(formatFrDate(item.publishedAt) || "Date indisponible");
    const href = escapeHtml(item.link || "");

    if (!href) {
        return `<li><span class="alerts-link">${title}</span><span class="alerts-meta">${source} - ${date}</span></li>`;
    }

    return `
      <li>
        <a class="alerts-link" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a>
        <span class="alerts-meta">${source} - ${date}</span>
      </li>
    `;
}

function renderAlertsTicker(items) {
    const ticker = document.getElementById("alertsTicker");
    if (!ticker) return;

    ticker.style.removeProperty("--alerts-scroll-distance");

    const maxItems = parseInt(ticker.getAttribute("data-max-items") || "12", 10) || 12;
    const maxAgeDays =
        parseInt(ticker.getAttribute("data-max-age-days") || String(DEFAULT_MAX_ALERT_AGE_DAYS), 10) ||
        DEFAULT_MAX_ALERT_AGE_DAYS;

    const recent = items.filter((it) => isRecentDate(it.publishedAt, maxAgeDays)).slice(0, maxItems);

    if (!recent.length) {
        ticker.classList.remove("is-animated");
        ticker.innerHTML = `<p class="alerts-empty">Aucune alerte récente : les articles trop anciens ont été retirés.</p>`;
        return;
    }

    const rows = recent.map(alertItemMarkup).join("");
    const animate = recent.length > 4;

    ticker.classList.toggle("is-animated", animate);

    if (!animate) {
        ticker.innerHTML = `<ul id="alertsTickerList" class="alerts-list">${rows}</ul>`;
        return;
    }

    ticker.innerHTML = `
      <div class="alerts-ticker-track">
        <ul id="alertsTickerList" class="alerts-list">${rows}</ul>
        <ul class="alerts-list alerts-list-clone" aria-hidden="true">${rows}</ul>
      </div>
    `;

    const firstList = ticker.querySelector("#alertsTickerList");
    if (firstList) {
        ticker.style.setProperty("--alerts-scroll-distance", `${firstList.scrollHeight + 16}px`);
    }
}

async function loadRssNews() {
    const grid = document.getElementById("rssGrid");
    if (!grid) return;

    try {
        const maxNewsItems =
            parseInt(grid.getAttribute("data-max-items") || String(DEFAULT_MAX_NEWS_ITEMS), 10) ||
            DEFAULT_MAX_NEWS_ITEMS;

        const res = await fetch(NEWS_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const parsed = parseNewsPayload(data);
        const topItems = parsed.items.slice(0, maxNewsItems);

        renderNewsGrid(topItems);
        renderSources(parsed.sources);
        renderAlertsTicker(parsed.items);
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<div class="rss-loading">Erreur de chargement des actualités.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", loadRssNews);
