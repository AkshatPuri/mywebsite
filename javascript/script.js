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
    const themes = ['light', 'dark', 'arcade', 'forest', 'mono'];
    const themeMeta = {
        light: { icon: 'fas fa-moon', label: 'Light theme' },
        dark: { icon: 'fas fa-sun', label: 'Dark theme' },
        arcade: { icon: 'fas fa-gamepad', label: 'Arcade theme' },
        forest: { icon: 'fas fa-tree', label: 'Forest theme' },
        mono: { icon: 'fas fa-adjust', label: 'Mono theme' }
    };
    const projectCards = [...document.querySelectorAll('.project-card')];
    const featuredProjectLayouts = [
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
    ];
    const rowPatterns = [
        [4, 2, 2],
        [3, 3, 2],
        [3, 2, 3],
        [2, 3, 3],
        [2, 4, 2],
        [2, 2, 4],
        [2, 2, 2, 2]
    ];
    const heightBands = [
        { min: 178, max: 210 },
        { min: 190, max: 228 },
        { min: 202, max: 238 }
    ];

    // ---- Theme Toggle Logic ----
    setTheme('light');

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            setTheme(getNextTheme(currentTheme));
        });
    }

    setupProjectGrid(projectCards);
    setupCircleCursor();
    setupCardPopIn();
    setupBioTyping();
    setupIntroPhotoLock();

    function pickRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function randomBetween(min, max) {
        return min + Math.round(Math.random() * (max - min));
    }

    function shuffle(items) {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    }

    function canPackRemainingRows(count) {
        return count === 0 || count === 3 || count === 4 || count >= 6;
    }

    function setupProjectGrid(cards) {
        if (!cards.length) {
            return;
        }

        const projectGrid = cards[0].parentElement;
        if (!projectGrid) {
            return;
        }

        const featuredCards = cards.filter(isFeaturedCard);
        const supportingCards = shuffle(cards.filter((card) => !isFeaturedCard(card)));
        const orderedCards = [...featuredCards, ...supportingCards];

        orderedCards.forEach((card) => projectGrid.appendChild(card));
        const supportingStartIndex = applyFeaturedLayouts(orderedCards);
        applySupportingLayouts(orderedCards, supportingStartIndex);
    }

    function isFeaturedCard(card) {
        return Boolean(card.querySelector('.card-badge'));
    }

    function applyFeaturedLayouts(cards) {
        const layouts = pickRandom(featuredProjectLayouts);
        layouts.forEach((layout, index) => {
            const card = cards[index];
            if (!card) {
                return;
            }

            applyProjectLayout(card, layout);
            card.classList.add('featured-project-card');
        });
        return Math.min(layouts.length, cards.length);
    }

    function applySupportingLayouts(cards, startIndex) {
        let cardIndex = startIndex;

        while (cardIndex < cards.length) {
            const remaining = cards.length - cardIndex;
            const pattern = pickRowPattern(remaining);

            pattern.forEach((span) => {
                const card = cards[cardIndex];
                if (!card) {
                    return;
                }

                const heightBand = pickRandom(heightBands);
                applyProjectLayout(card, {
                    span,
                    height: randomBetween(heightBand.min, heightBand.max)
                });
                cardIndex += 1;
            });
        }
    }

    function pickRowPattern(remaining) {
        const availablePatterns = shuffle(rowPatterns).filter((pattern) => {
            const cardsAfterThisRow = remaining - pattern.length;
            return pattern.length <= remaining && canPackRemainingRows(cardsAfterThisRow);
        });

        return availablePatterns[0] || fallbackRowPattern(remaining);
    }

    function fallbackRowPattern(remaining) {
        if (remaining === 5) {
            return [4, 4];
        }
        if (remaining >= 4) {
            return [2, 2, 2, 2];
        }
        if (remaining === 3) {
            return [3, 3, 2];
        }
        if (remaining === 2) {
            return [4, 4];
        }
        return [8];
    }

    function applyProjectLayout(card, layout) {
        card.style.setProperty('--project-span', layout.span);
        card.style.setProperty('--project-height', `${layout.height}px`);
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

    function setupIntroPhotoLock() {
        const bioCard = document.querySelector('.intro-grid .bio-card');
        const profileSide = document.querySelector('.intro-grid .profile-side');
        const sideBySideQuery = window.matchMedia('(min-width: 981px)');
        if (!bioCard || !profileSide) {
            return;
        }

        let frameId = null;
        const syncPhotoSize = () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;

                if (!sideBySideQuery.matches) {
                    profileSide.style.removeProperty('--photo-size');
                    return;
                }

                const bioHeight = Math.ceil(bioCard.getBoundingClientRect().height);
                if (bioHeight > 0) {
                    profileSide.style.setProperty('--photo-size', `${bioHeight}px`);
                }
            });
        };

        syncPhotoSize();
        window.addEventListener('resize', syncPhotoSize);
        sideBySideQuery.addEventListener('change', syncPhotoSize);

        if ('ResizeObserver' in window) {
            new ResizeObserver(syncPhotoSize).observe(bioCard);
        }

        document.fonts?.ready.then(syncPhotoSize);
    }

    function setTheme(theme) {
        const activeTheme = themes.includes(theme) ? theme : 'light';
        document.documentElement.setAttribute('data-theme', activeTheme);
        updateThemeIcon(activeTheme);
    }

    function getNextTheme(currentTheme) {
        const currentIndex = themes.indexOf(currentTheme);
        return themes[(currentIndex + 1) % themes.length];
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) {
            return;
        }

        const nextTheme = getNextTheme(theme);
        themeIcon.className = themeMeta[theme].icon;
        themeToggle?.setAttribute('aria-label', `Switch to ${themeMeta[nextTheme].label.toLowerCase()}`);
        themeToggle?.setAttribute('title', themeMeta[theme].label);
    }

});

window.addEventListener('pageshow', () => {
    window.scrollTo(0, 0);
});
