/**
 * app.js — Entry point
 */

import { CONFIG }                        from './config.js';
import { renderHero }                    from './sections/hero.js';
import { renderAbout }                   from './sections/about.js';
import { renderSkills }                  from './sections/skills.js';
import { renderProjects }                from './sections/projects.js';
import { renderContact }                 from './sections/contact.js';
import { initCursor }                    from './utils/cursor.js';
import { initAnimations }                from './utils/animations.js';
import { initBackground }                from './utils/background.js';
import { initSmoothScroll }              from './utils/smoothscroll.js';
import { loadSettings, applySettings,
         watchSystemTheme, getSettings } from './utils/settings.js';
import { createSettingsPanel }           from './components/settings-panel.js';
import { createT }                       from './i18n.js';

// ─── Nav ────────────────────────────────────────────────────
function createNav(t) {
  const nav = document.createElement('nav');
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  // NO href="#..." — all navigation via data-section
  const items = [
    { id: 'about',    key: 'nav_about'    },
    { id: 'skills',   key: 'nav_skills'   },
    { id: 'projects', key: 'nav_projects' },
    { id: 'contact',  key: 'nav_contact'  },
  ];

  nav.innerHTML = `
    <button class="nav-logo" data-section="hero" aria-label="Back to top">
      ${CONFIG.meta.firstName}<span>.</span>
    </button>

    <ul class="nav-links" role="list">
      ${items.map(i => `
        <li>
          <button class="nav-link" data-section="${i.id}" data-id="${i.id}">
            ${t(i.key)}
          </button>
        </li>
      `).join('')}
    </ul>

    <button class="nav-hamburger" aria-label="Toggle menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  `;

  // ── Hamburger → open/close liquid glass overlay ──────────
  const hamburger = nav.querySelector('.nav-hamburger');
  let overlay = null;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMobileMenu();
    else openMobileMenu();
  });

  function openMobileMenu() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');

    overlay = createMobileOverlay(items, t, closeMobileMenu);
    document.body.appendChild(overlay);
    // Force reflow before animating
    overlay.offsetHeight;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    if (!overlay) return;
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    overlay.addEventListener('transitionend', () => overlay?.remove(), { once: true });
    overlay = null;
  }

  // Keyboard: ESC closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) closeMobileMenu();
  });

  // ── Scroll behavior ──────────────────────────────────────
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
    updateActiveLink(nav);
  }, { passive: true });

  return nav;
}

// ─── Liquid glass mobile overlay ────────────────────────────
function createMobileOverlay(items, t, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'mobile-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Navigation');

  overlay.innerHTML = `
    <div class="mobile-overlay-glass">
      <nav class="mobile-nav-inner">
        ${items.map((item, i) => `
          <button
            class="mobile-nav-item"
            data-section="${item.id}"
            style="--i: ${i}"
            tabindex="0"
          >
            <span class="mni-num">0${i + 1}</span>
            <span class="mni-label">${t('nav_' + item.id)}</span>
            <span class="mni-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </span>
          </button>
        `).join('')}
      </nav>

      <div class="mobile-overlay-footer">
        <span class="mof-location">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Bangkok, TH
        </span>
        <span class="mof-year">${new Date().getFullYear()}</span>
      </div>
    </div>
  `;

  // Close on backdrop click (outside glass card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) onClose();
  });

  // Close after nav item clicked
  overlay.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', onClose);
  });

  return overlay;
}

// ─── Active link ─────────────────────────────────────────────
function updateActiveLink(nav) {
  const scrollY = window.scrollY + 140;
  let activeId  = 'hero';
  document.querySelectorAll('section[id]').forEach(s => {
    if (s.offsetTop <= scrollY) activeId = s.id;
  });
  nav.querySelectorAll('[data-id]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === activeId);
  });
}

// ─── Footer ─────────────────────────────────────────────────
function createFooter(t) {
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <p class="footer-copy">
      © ${new Date().getFullYear()} <span>${CONFIG.meta.fullName}</span>
    </p>
    <button class="footer-top" data-section="hero" aria-label="${t('back_top')}">
      ${t('back_top')}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
  `;
  return footer;
}

// ─── Scroll progress bar ─────────────────────────────────────
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
    bar.style.width = Math.min(pct, 100) + '%';
  }, { passive: true });
}

// ─── Spotlight (project cards) ───────────────────────────────
function initProjectSpotlight() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// ─── Cursor ──────────────────────────────────────────────────
let _cursorCleanup = null;
function syncCursor() {
  const { cursor } = getSettings();
  if (cursor && !_cursorCleanup)       { _cursorCleanup = initCursor(); }
  else if (!cursor && _cursorCleanup)  { _cursorCleanup(); _cursorCleanup = null; }
}

// ─── Background ──────────────────────────────────────────────
let _bgCleanup = null;
function syncBackground() {
  const { bgfx } = getSettings();
  if (bgfx && !_bgCleanup)       { _bgCleanup = initBackground(); }
  else if (!bgfx && _bgCleanup)  { _bgCleanup(); _bgCleanup = null; }
}

// ─── Stylesheet ──────────────────────────────────────────────
function loadStyles() {
  return new Promise(resolve => {
    if (document.querySelector('link[href*="styles.css"]')) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = './src/styles.css';
    link.onload = resolve; link.onerror = resolve;
    document.head.appendChild(link);
  });
}

function injectMeta() {
  document.title = `${CONFIG.meta.fullName} — Portfolio`;
  const metas = [
    { name: 'description', content: `${CONFIG.meta.fullName} — ${CONFIG.meta.roles[0]}` },
    { name: 'theme-color', content: '#090909' },
  ];
  metas.forEach(m => {
    let el = document.head.querySelector(`meta[name="${m.name}"]`);
    if (!el) { el = document.createElement('meta'); Object.entries(m).forEach(([k,v]) => el.setAttribute(k,v)); document.head.appendChild(el); }
    else el.content = m.content;
  });
}

// ─── Render ──────────────────────────────────────────────────
let _initialized = false;

async function render() {
  const root = document.getElementById('__root__');
  const t    = createT(getSettings());

  if (!_initialized) {
    await loadStyles();
    injectMeta();

    const { panel, trigger, backdrop } = createSettingsPanel();

    root.innerHTML = '';
    root.appendChild(createNav(t));
    root.appendChild(renderHero(CONFIG, t));
    root.appendChild(renderAbout(CONFIG, t));
    root.appendChild(renderSkills(CONFIG, t));
    root.appendChild(renderProjects(CONFIG, t));
    root.appendChild(renderContact(CONFIG, t));
    root.appendChild(createFooter(t));

    document.body.appendChild(backdrop);
    document.body.appendChild(trigger);
    document.body.appendChild(panel);

    _initialized = true;
    initAnimations();
    initSmoothScroll();
    initScrollProgress();
    initProjectSpotlight();
  } else {
    rerenderText(root, t);
  }

  syncCursor();
  syncBackground();
}

function rerenderText(root, t) {
  root.querySelectorAll('[data-id]').forEach(btn => {
    const map = { about:'nav_about', skills:'nav_skills', projects:'nav_projects', contact:'nav_contact' };
    const key = map[btn.dataset.id];
    if (key) btn.textContent = t(key);
  });
}

// ─── Bootstrap ───────────────────────────────────────────────
async function initApp() {
  const settings = loadSettings();
  applySettings(settings);
  watchSystemTheme();
  await render();
  window.addEventListener('pf:settings-changed', render);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
