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
    const themes = ['minimalist', 'light', 'dark', 'arcade', 'forest'];
    const themeMeta = {
        minimalist: { icon: 'fas fa-feather', label: 'Minimalist theme' },
        light: { icon: 'fas fa-moon', label: 'Light theme' },
        dark: { icon: 'fas fa-sun', label: 'Dark theme' },
        arcade: { icon: 'fas fa-gamepad', label: 'Arcade theme' },
        forest: { icon: 'fas fa-tree', label: 'Forest theme' }
    };
    const projectCards = [...document.querySelectorAll('.project-card')];
    const pinnedFeaturedTitles = ['Unannounced Project', 'The Tree Creator', 'The Bonfire 2: Uncharted Shores', 'Metal Haven', 'The Bonfire: Forsaken Lands'];
    const pinnedFeaturedLayouts = [
        { span: 4, height: 'clamp(12.5rem, 26vh, 16rem)' },
        { span: 2, height: 'clamp(11.5rem, 24vh, 15rem)' }
    ];
    const rowPatterns = [
        [4, 2, 2],
        [3, 2, 3],
        [2, 3, 3],
        [2, 3, 2],
        [2, 2, 4]
    ];
    const heightBands = [
        'clamp(10.5rem, 22vh, 13.5rem)',
        'clamp(11rem, 24vh, 14.5rem)',
        'clamp(11.5rem, 25vh, 15rem)'
    ];

    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

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
    setupVideoModal();

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
        return {
            span: pickNextSpan(remaining, rowFill, queuedSpans),
            height: pickRandom(heightBands)
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
        card.style.setProperty('--project-height', layout.height);
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


    function setupVideoModal() {
        const videoBtn = document.querySelector('.video-btn');
        const videoModal = document.getElementById('videoModal');
        const closeModalBtn = document.getElementById('closeModal');
        const modalBackdrop = document.getElementById('modalBackdrop');
        const iframe = document.getElementById('showreelIframe');

        if (!videoBtn || !videoModal || !iframe) {
            return;
        }

        // Extract YouTube ID from link
        const originalUrl = videoBtn.getAttribute('href');
        let videoId = 'whk_Isv_YpY'; // fallback ID
        if (originalUrl) {
            const urlMatch = originalUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (urlMatch) {
                videoId = urlMatch[1];
            }
        }

        const openModal = (e) => {
            if (e.button !== 0 || e.ctrlKey || e.shiftKey || e.metaKey || e.altKey) {
                return;
            }
            e.preventDefault();

            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
            videoModal.classList.add('open');
            videoModal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');

            if (closeModalBtn) {
                closeModalBtn.focus();
            }
        };

        const closeModal = () => {
            videoModal.classList.remove('open');
            videoModal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            iframe.src = '';
            videoBtn.focus();
        };

        videoBtn.addEventListener('click', openModal);

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', closeModal);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal.classList.contains('open')) {
                closeModal();
            }
        });
    }

    function setTheme(theme) {
        const activeTheme = themes.includes(theme) ? theme : 'light';
        document.documentElement.setAttribute('data-theme', activeTheme);
        localStorage.setItem('theme', activeTheme);
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
