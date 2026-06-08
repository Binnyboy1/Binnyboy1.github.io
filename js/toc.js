/* ============================================================
   TOC.JS - Table of Contents Sidebar Generator
   ============================================================
   Reads the blog page's heading elements and dynamically
   builds a sticky right-hand sidebar with two display modes:

   DEFAULT (not hovering):
     Shows a minimap of horizontal bars. Bar width is
     proportional to the heading's text length. A vertical
     highlight bar on the left edge spans from the current
     H1 section down to the currently-visible sub-heading.

   HOVER:
     Fades in a fully readable, scrollable navigation list
     showing each heading's actual text. H3 items are
     indented; H1 and H2 items share the same left edge.

   Bar row geometry (must match CSS):
     ROW_HEIGHT = 12px  (each bar row's height)
     ROW_GAP    =  1px  (gap between rows in flex layout)
     ROW_TOTAL  = 13px  (slot occupied by each row)

   Highlight bar math:
     translateY = parentH1Index × 13
     height     = (currentIndex − parentH1Index) × 13 + 12
   ============================================================ */

(function () {
  'use strict';

  /* ── Layout constants (must stay in sync with blog.css) ── */
  const ROW_HEIGHT  = 12;   // px — height of each .toc-bar-row
  const ROW_GAP     = 1;    // px — gap between rows
  const ROW_TOTAL   = ROW_HEIGHT + ROW_GAP; // 13 px per slot

  /* How far from viewport-top a heading must be to count as "passed" */
  const SCROLL_OFFSET = 110; // px

  /* Max bar widths; H3 gets 12 px less to account for its indent */
  const MAX_BAR_H1H2 = 55;  // px
  const MAX_BAR_H3   = 43;  // px  (MAX_BAR_H1H2 − 12)

  /* ── Entry point ─────────────────────────────────────────── */

  /**
   * Scans `contentSelector` for h1/h2/h3 headings,
   * injects a fully-built TOC sidebar into `containerSelector`.
   *
   * @param {string} contentSelector   CSS selector for the article body
   * @param {string} containerSelector CSS selector for the empty TOC div
   */
  function generateTOC(contentSelector, containerSelector) {
    const contentEl   = document.querySelector(contentSelector);
    const containerEl = document.querySelector(containerSelector);
    if (!contentEl || !containerEl) return;

    const headingEls = Array.from(contentEl.querySelectorAll('h1, h2, h3'));
    if (!headingEls.length) return;

    /* Ensure every heading has a stable anchor id */
    headingEls.forEach((el, i) => {
      if (!el.id) {
        el.id = slugify(el.textContent.trim()) || ('toc-item-' + i);
      }
    });

    /* Build the data model */
    const items = headingEls.map((el, i) => ({
      index:       i,
      level:       parseInt(el.tagName[1], 10), // 1 | 2 | 3
      text:        el.textContent.trim(),
      id:          el.id,
      headingEl:   el,
      linkEl:      null,   // filled by buildDOM
      barInnerEl:  null,   // filled by buildDOM
    }));

    /* Build DOM and get a reference to the highlight bar element */
    const { highlightBarEl } = buildDOM(items, containerEl);

    /* ── Scroll tracking ──────────────────────────────────── */
    let activeIndex = 0;

    function update() {
      /* Only run when the blog page is visible */
      const blogPage = document.getElementById('blog');
      if (!blogPage || !blogPage.classList.contains('active')) return;

      const idx = getCurrentIndex(items);
      if (idx !== activeIndex) {
        activeIndex = idx;
        applyActiveState(items, activeIndex, highlightBarEl);
      }
    }

    /* Passive scroll listener on the window */
    window.addEventListener('scroll', update, { passive: true });

    /* Re-evaluate when the blog page is switched to (SPA navigation) */
    watchPageActive('blog', () => {
      /* rAF lets the display:block layout settle before measuring rects */
      requestAnimationFrame(() => {
        activeIndex = getCurrentIndex(items);
        applyActiveState(items, activeIndex, highlightBarEl);
      });
    });

    /* Set initial state */
    applyActiveState(items, 0, highlightBarEl);
  }

  /* ── DOM construction ────────────────────────────────────── */

  function buildDOM(items, containerEl) {
    /* Outer wrapper — the hover trigger */
    const wrapper = document.createElement('div');
    wrapper.className = 'toc-wrapper';

    /*
     * CSS grid with both children at grid-area 1/1 so they
     * overlap in the same cell. Opacity transitions swap them.
     */
    const grid = document.createElement('div');
    grid.className = 'toc-grid';

    /* ── Child 1 · Text nav (opacity:0 normally, 1 on hover) ── */
    const textChild = document.createElement('div');
    textChild.className = 'toc-text-child';

    const titleEl = document.createElement('p');
    titleEl.className = 'toc-title';
    titleEl.textContent = 'On this page';
    textChild.appendChild(titleEl);

    const navEl = document.createElement('nav');
    navEl.setAttribute('aria-label', 'On this page');

    /* ── Child 2 · Bars (opacity:1 normally, 0 on hover) ────── */
    const barsChild = document.createElement('div');
    barsChild.className = 'toc-bars-child';

    /* The vertical highlight bar — absolutely positioned at left:0 */
    const highlightBarEl = document.createElement('div');
    highlightBarEl.className = 'toc-highlight-bar';
    barsChild.appendChild(highlightBarEl);

    /* ── Per-heading rows ───────────────────────────────────── */
    items.forEach(item => {
      /*
       * Indentation rules:
       *   H1  → 0 px
       *   H2  → 0 px  (same level as H1 visually)
       *   H3  → 12 px (0.75 rem)
       */
      const indentPx = item.level === 3 ? 12 : 0;

      /* — Nav link (text child) — */
      const link = document.createElement('a');
      link.className    = 'toc-nav-link';
      link.href         = '#' + item.id;
      link.textContent  = item.text;
      link.style.paddingLeft = indentPx + 'px';

      link.addEventListener('click', e => {
        e.preventDefault();
        item.headingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      item.linkEl = link;
      navEl.appendChild(link);

      /* — Bar row (bars child) — */
      const barRow = document.createElement('div');
      barRow.className = 'toc-bar-row';
      barRow.style.paddingLeft = indentPx + 'px';

      const barInner = document.createElement('div');
      barInner.className = 'toc-bar';
      barInner.style.width = calcBarWidth(item.text, indentPx) + 'px';

      item.barInnerEl = barInner;
      barRow.appendChild(barInner);
      barsChild.appendChild(barRow);
    });

    textChild.appendChild(navEl);
    grid.appendChild(textChild);
    grid.appendChild(barsChild);
    wrapper.appendChild(grid);
    containerEl.appendChild(wrapper);

    return { wrapper, highlightBarEl };
  }

  /* ── Bar width calculation ───────────────────────────────── */

  /**
   * Returns a bar width (px) that is proportional to the heading
   * text length, capped so bars never overflow the narrow sidebar.
   *
   * The cap is smaller for H3 (indentPx = 12) to leave room for
   * the extra indentation.
   */
  function calcBarWidth(text, indentPx) {
    const max = indentPx === 12 ? MAX_BAR_H3 : MAX_BAR_H1H2;
    return Math.max(4, Math.min(max, text.length));
  }

  /* ── Scroll position tracking ────────────────────────────── */

  /**
   * Returns the index of the last heading whose top edge is at or
   * above SCROLL_OFFSET px from the viewport top.
   * Because headings are in DOM (and therefore scroll) order we can
   * break as soon as we find one that hasn't been reached yet.
   */
  function getCurrentIndex(items) {
    let active = 0;
    for (let i = 0; i < items.length; i++) {
      const top = items[i].headingEl.getBoundingClientRect().top;
      if (top <= SCROLL_OFFSET) {
        active = i;
      } else {
        break; // all subsequent headings are further down — stop early
      }
    }
    return active;
  }

  /* ── Active-state application ────────────────────────────── */

  /**
   * Walks backwards from `idx` to find the nearest H1 ancestor.
   * H2 and H3 are sub-headings of H1; H1 is its own "parent".
   */
  function findParentH1(items, idx) {
    for (let i = idx; i >= 0; i--) {
      if (items[i].level === 1) return i;
    }
    return idx; // no H1 found above — treat current as root
  }

  /**
   * Updates:
   *   1. The vertical highlight bar (translateY + height)
   *   2. The active CSS class on nav links and bar inners
   */
  function applyActiveState(items, activeIdx, highlightBarEl) {
    const h1Idx = findParentH1(items, activeIdx);

    /* Highlight bar spans from the parent H1 row down to the active row */
    const barTop    = h1Idx * ROW_TOTAL;
    const barBottom = activeIdx * ROW_TOTAL + ROW_HEIGHT;
    const barHeight = Math.max(ROW_HEIGHT, barBottom - barTop);

    highlightBarEl.style.transform = `translateY(${barTop}px)`;
    highlightBarEl.style.height    = `${barHeight}px`;

    /* Toggle active classes */
    items.forEach((item, i) => {
      const isActive = i === activeIdx;
      item.linkEl.classList.toggle('toc-nav-active',  isActive);
      item.barInnerEl.classList.toggle('toc-bar-active', isActive);
    });
  }

  /* ── SPA page-activation watcher ────────────────────────── */

  /**
   * Observes attribute mutations on the page element.
   * Fires `callback` whenever the page gains the `.active` class
   * (i.e. the user navigates to this page via the left sidebar).
   */
  function watchPageActive(pageId, callback) {
    const pageEl = document.getElementById(pageId);
    if (!pageEl) return;

    const mo = new MutationObserver(() => {
      if (pageEl.classList.contains('active')) callback();
    });
    mo.observe(pageEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── Utilities ───────────────────────────────────────────── */

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  /* ── Initialise on DOMContentLoaded ─────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    generateTOC(
      '#blog .blog-article-body',
      '#blog .blog-toc-container'
    );
  });

}());