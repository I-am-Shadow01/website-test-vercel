/**
 * utils/smoothscroll.js
 * Intercept all internal anchor clicks → smooth scroll WITHOUT changing the URL hash
 */

export function initSmoothScroll() {
  const NAV_H = 64; // matches --nav-h

  // If page loaded with a hash, strip it silently
  if (location.hash) {
    const id = location.hash.slice(1);
    history.replaceState(null, '', location.pathname + location.search);
    // Still scroll to the section if it exists
    const target = document.getElementById(id);
    if (target) {
      setTimeout(() => {
        const top = target.getBoundingClientRect().top + window.scrollY - NAV_H;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 300);
    }
  }

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const id = anchor.getAttribute('href').slice(1);
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    // Never push hash to URL
    const top = target.getBoundingClientRect().top + window.scrollY - NAV_H;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}
