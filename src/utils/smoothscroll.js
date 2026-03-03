/**
 * utils/smoothscroll.js
 * Navigation via data-section attributes — NO href="#..." anywhere
 * Zero hash pollution in URL
 */

const NAV_H = 64;

export function scrollTo(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - NAV_H;
  window.scrollTo({ top, behavior: 'smooth' });
}

export function initSmoothScroll() {
  // Strip any residual hash from URL immediately
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }

  // Handle [data-section] clicks anywhere in the document
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-section]');
    if (!el) return;
    e.preventDefault();
    const id = el.dataset.section;
    scrollTo(id);
  });

  // Also guard remaining href="#..." (safety net)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    if (id) scrollTo(id);
  });
}
