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

    // Mise à jour automatique de l'année dans le footer
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Mettre en évidence le lien de la page active dans la navigation
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

    // Défilement fluide pour les ancres internes
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Vérifie que l'ancre existe sur la page actuelle ET que ce n'est pas juste "#"
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

        // État par défaut
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


// Veille - RSS feed loader (GitHub Pages-friendly)
(async function initRssFeed() {
    const container = document.getElementById('rssFeed');
    if (!container) return;

    const rssUrl = container.getAttribute('data-rss') || 'https://openai.com/blog/rss.xml';
    const maxItems = parseInt(container.getAttribute('data-rss-items') || '6', 10);

    const statusEl = document.getElementById('rssStatus');
    const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

    const renderItems = (items) => {
        container.innerHTML = '';
        items.slice(0, maxItems).forEach((it) => {
            const card = document.createElement('a');
            card.className = 'rss-card';
            card.href = it.link;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';

            const title = document.createElement('div');
            title.className = 'rss-title';
            title.textContent = it.title || 'Article';

            const meta = document.createElement('div');
            meta.className = 'rss-meta';

            const dateText = it.pubDate ? new Date(it.pubDate).toLocaleDateString('fr-FR') : '';
            meta.textContent = dateText;

            card.appendChild(title);
            card.appendChild(meta);
            container.appendChild(card);
        });
    };

    try {
        setStatus('Chargement du flux RSS…');
        // rss2json sert de proxy CORS pour les sites statiques
        const api = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rssUrl);
        const res = await fetch(api, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data || !Array.isArray(data.items)) throw new Error('Réponse RSS invalide');

        renderItems(data.items);
        setStatus('');
    } catch (e) {
        console.error(e);
        setStatus("Impossible de charger le flux RSS (CORS / réseau). Vous pouvez remplacer l'URL du flux dans veille.html.");
    }
})();
