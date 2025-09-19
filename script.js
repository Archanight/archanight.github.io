document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('header nav ul li a');
    const burgerMenu = document.getElementById('burger-menu');
    const navUL = document.querySelector('header nav ul');
    const yearSpan = document.getElementById('year');

    // Burger menu toggle
    if (burgerMenu && navUL) {
        burgerMenu.addEventListener('click', () => {
            navUL.classList.toggle('active');
            burgerMenu.classList.toggle('toggle');
        });
        // Fermer le menu si on clique sur un lien (pour mobile)
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                // Ne pas fermer immédiatement si c'est un lien d'ancrage sur la même page
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#')) { // Seulement si c'est un lien vers une autre page
                    if (navUL.classList.contains('active')) {
                        navUL.classList.remove('active');
                        burgerMenu.classList.remove('toggle');
                    }
                } else if (href && href.startsWith('#') && navUL.classList.contains('active')) {
                    // Pour les ancres sur la même page, fermer le menu
                     navUL.classList.remove('active');
                     burgerMenu.classList.remove('toggle');
                }
            });
        });
    }

    // Mise à jour automatique de l'année dans le footer
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Mettre en évidence le lien de la page active dans la navigation
    const currentPagePath = window.location.pathname;
    let currentPageName = currentPagePath.substring(currentPagePath.lastIndexOf("/") + 1);
    if (currentPageName === "" || currentPageName === "index.html") {
        currentPageName = "index.html"; // Normaliser pour l'accueil
    }


    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPageName || (currentPageName === "index.html" && (linkHref === "./" || linkHref === "index.html"))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Optionnel: Défilement fluide pour les ancres INTERNES sur une page
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Vérifie que l'ancre existe sur la page actuelle ET que ce n'est pas juste "#"
            if (href.length > 1 && document.querySelector(href)) {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                let headerOffset = 70; // Hauteur par défaut
                const header = document.querySelector('header');
                if (header) {
                    headerOffset = header.offsetHeight;
                }
                
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });
});