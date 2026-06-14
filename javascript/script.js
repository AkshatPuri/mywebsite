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
    const pinnedFeaturedTitles = ['The Bonfire 2: Uncharted Shores', 'Metal Haven'];
    const pinnedFeaturedLayouts = [
        { span: 4, height: 235 },
        { span: 2, height: 220 }
    ];
    const rowPatterns = [
        [4, 2, 2],
        [3, 2, 3],
        [2, 3, 3],
        [2, 3, 2],
        [2, 2, 4]
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
    setupProjectCardLinks();
    setupProjectFilters();
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

        const featuredCards = orderFeaturedCards(cards.filter(isFeaturedCard));
        const supportingCards = shuffle(cards.filter((card) => !isFeaturedCard(card)));
        const orderedCards = [...featuredCards, ...supportingCards];

        orderedCards.forEach((card) => projectGrid.appendChild(card));
        applyOrderedProjectLayouts(orderedCards);
    }

    function isFeaturedCard(card) {
        return Boolean(card.querySelector('.card-badge'));
    }

    function orderFeaturedCards(cards) {
        const pinnedRanks = new Map(pinnedFeaturedTitles.map((title, index) => [title, index]));

        return cards
            .map((card, index) => ({ card, index }))
            .sort((left, right) => {
                const leftRank = pinnedRanks.get(getCardTitle(left.card)) ?? Number.MAX_SAFE_INTEGER;
                const rightRank = pinnedRanks.get(getCardTitle(right.card)) ?? Number.MAX_SAFE_INTEGER;
                return leftRank - rightRank || left.index - right.index;
            })
            .map(({ card }) => card);
    }

    function getCardTitle(card) {
        return card.querySelector('.card-title')?.textContent.trim() || '';
    }

    function applyOrderedProjectLayouts(cards) {
        let rowFill = 0;
        const queuedSpans = [];

        cards.forEach((card, index) => {
            const usePinned = isFeaturedCard(card) && index < pinnedFeaturedLayouts.length;
            const layout = usePinned ? pinnedFeaturedLayouts[index] : createFlexibleProjectLayout(cards.length - index, rowFill, queuedSpans);

            applyProjectLayout(card, layout);
            rowFill = (rowFill + layout.span) % 8;

            if (isFeaturedCard(card)) {
                card.classList.add('featured-project-card');
            } else {
                card.classList.remove('featured-project-card');
            }
        });
    }

    function createFlexibleProjectLayout(remaining, rowFill, queuedSpans) {
        const heightBand = pickRandom(heightBands);
        return {
            span: pickNextSpan(remaining, rowFill, queuedSpans),
            height: randomBetween(heightBand.min, heightBand.max)
        };
    }

    function pickNextSpan(remaining, rowFill, queuedSpans) {
        if (queuedSpans.length > 0) {
            return queuedSpans.shift();
        }

        if (rowFill > 0) {
            return 8 - rowFill;
        }

        queuedSpans.push(...pickRowPattern(remaining));
        return queuedSpans.shift();
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
            if (element.classList.contains('project-card') && !element.querySelector('.card-links a')) {
                return;
            }
            element.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
            element.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
        });
    }

    function setupProjectCardLinks() {
        const projectCards = document.querySelectorAll('.project-card');
        projectCards.forEach((card) => {
            const firstLink = card.querySelector('.card-links a');
            if (!firstLink) {
                return;
            }

            card.addEventListener('click', (event) => {
                if (event.target.closest('a') || event.target.closest('button')) {
                    return;
                }
                window.open(firstLink.href, '_blank', 'noopener,noreferrer');
            });
        });
    }

    function setupProjectFilters() {
        const filterContainer = document.querySelector('.work-filters');
        if (!filterContainer) {
            return;
        }

        const filterButtons = filterContainer.querySelectorAll('.filter-btn');
        const projectGrid = document.querySelector('.work-grid');
        if (!projectGrid) {
            return;
        }

        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');
                const cards = [...projectGrid.querySelectorAll('.project-card')];
                const visibleCards = [];

                cards.forEach((card) => {
                    const tags = [...card.querySelectorAll('.tag')].map((t) => t.textContent.trim().toLowerCase());
                    const isTool = tags.includes('tool');
                    const isGame = !isTool;

                    let matches = false;
                    if (filterValue === 'all') {
                        matches = true;
                    } else if (filterValue === 'c++') {
                        matches = tags.includes('c++');
                    } else if (filterValue === 'c#') {
                        matches = tags.includes('c#');
                    } else if (filterValue === 'tool') {
                        matches = isTool;
                    } else if (filterValue === 'game') {
                        matches = isGame;
                    }

                    if (matches) {
                        card.classList.remove('is-hidden');
                        visibleCards.push(card);
                    } else {
                        card.classList.add('is-hidden');
                    }
                });

                applyOrderedProjectLayouts(visibleCards);
            });
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
