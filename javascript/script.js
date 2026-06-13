/* ==========================================================================
   VANILLA JS - Theme Switcher & Scroll-to-Top Button
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // DOM Elements
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    let projectCards = [...document.querySelectorAll('.project-card')];

    // ---- Theme Toggle Logic ----
    const savedTheme = getStoredTheme();
    setTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    setupCircleCursor();

    // Keep Bonfire projects prominent, then randomize the supporting project order.
    const projectGrid = projectCards[0]?.parentElement;
    const bonfireCards = projectCards.slice(0, 2);
    const supportingCards = shuffle(projectCards.slice(2));
    projectCards = [
        ...bonfireCards,
        supportingCards.shift(),
        ...shuffle(supportingCards)
    ].filter(Boolean);

    if (projectGrid) {
        projectCards.forEach((card) => projectGrid.appendChild(card));
    }

    // Pack projects into varied full-width rows.
    const featuredProjectLayouts = pickRandom([
        [
            { span: 4, height: 235 },
            { span: 2, height: 220 },
            { span: 2, height: 205 }
        ],
        [
            { span: 3, height: 230 },
            { span: 3, height: 230 },
            { span: 2, height: 205 }
        ],
        [
            { span: 4, height: 225 },
            { span: 2, height: 235 },
            { span: 2, height: 215 }
        ]
    ]);
    const rowPatterns = shuffle([
        [4, 2, 2],
        [3, 3, 2],
        [3, 2, 3],
        [2, 3, 3],
        [2, 4, 2],
        [2, 2, 4],
        [2, 2, 2, 2]
    ]);
    const heightBands = [
        { min: 178, max: 210 },
        { min: 190, max: 228 },
        { min: 202, max: 238 }
    ];
    let cardIndex = 0;

    featuredProjectLayouts.forEach((layout) => {
        const card = projectCards[cardIndex];
        if (!card) {
            return;
        }

        card.style.setProperty('--project-span', layout.span);
        card.style.setProperty('--project-height', `${layout.height}px`);
        card.classList.add('featured-project-card');
        cardIndex += 1;
    });

    while (cardIndex < projectCards.length) {
        const remaining = projectCards.length - cardIndex;
        const availablePatterns = rowPatterns.filter((pattern) => {
            const cardsAfterThisRow = remaining - pattern.length;
            return pattern.length <= remaining && canPackRemainingRows(cardsAfterThisRow);
        });
        const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];

        pattern.forEach((span) => {
            const card = projectCards[cardIndex];
            if (!card) {
                return;
            }

            const heightBand = pickRandom(heightBands);
            const height = randomBetween(heightBand.min, heightBand.max);
            card.style.setProperty('--project-span', span);
            card.style.setProperty('--project-height', `${height}px`);
            cardIndex += 1;
        });
    }

    setupCardPopIn();
    setupBioTyping();

    function pickRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function randomBetween(min, max) {
        return min + Math.round(Math.random() * (max - min));
    }

    function shuffle(items) {
        return [...items].sort(() => Math.random() - 0.5);
    }

    function canPackRemainingRows(count) {
        return count === 0 || count === 3 || count === 4 || count >= 6;
    }

    function setupCardPopIn() {
        const cards = [...document.querySelectorAll('.bento-card')];
        cards.forEach((card, index) => {
            const randomDelay = randomBetween(20, 420);
            const steppedDelay = Math.min(index * 20, 220);
            card.style.setProperty('--pop-delay', `${randomDelay + steppedDelay}ms`);
            card.classList.add('is-popping');
        });
    }

    function setupCircleCursor() {
        if (!window.matchMedia('(pointer: fine)').matches) {
            return;
        }

        const cursor = document.createElement('div');
        cursor.className = 'site-cursor';
        document.body.appendChild(cursor);

        window.addEventListener('mousemove', (event) => {
            cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
            cursor.classList.add('is-visible');
        });

        document.addEventListener('mouseleave', () => {
            cursor.classList.remove('is-visible');
        });

        document.querySelectorAll('a, button, .project-card').forEach((element) => {
            element.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
            element.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
        });
    }

    function setupBioTyping() {
        const bioText = document.querySelector('.bio-text');
        if (!bioText) {
            return;
        }

        const fullText = bioText.textContent.trim();
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            bioText.textContent = fullText;
            return;
        }

        bioText.textContent = '';
        bioText.classList.add('is-typing');

        let index = 0;
        const typeNextCharacter = () => {
            bioText.textContent = fullText.slice(0, index);
            index += 1;

            if (index <= fullText.length) {
                window.setTimeout(typeNextCharacter, 18 + Math.random() * 18);
                return;
            }

            window.setTimeout(() => {
                bioText.classList.remove('is-typing');
            }, 900);
        };

        window.setTimeout(typeNextCharacter, 520);
    }

    function getStoredTheme() {
        try {
            return localStorage.getItem('theme') || 'light';
        } catch (error) {
            return 'light';
        }
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            // Theme still changes even if storage is unavailable.
        }
        updateThemeIcon(theme);
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) {
            return;
        }

        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }

});

window.addEventListener('pageshow', () => {
    window.scrollTo(0, 0);
});
