/* Shared actions for the collection and company pages. Research and material
   pages retain their own context-aware header bindings. */
(() => {
  'use strict';
  const form = document.querySelector('.header-search');
  const input = form && form.querySelector('input[type="search"]');
  const isAbout = /(?:^|\/)about\.html$/.test(location.pathname);
  if (form && input) {
    form.removeAttribute('onsubmit');
    input.setAttribute('aria-label', isAbout ? 'Search trend research' : 'Search styles');
    input.placeholder = isAbout ? 'Search trends' : 'Search styles';
    input.value = new URLSearchParams(location.search).get('q') || '';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const query = input.value.trim();
      if (isAbout) {
        const target = new URL('trend.html', location.href);
        if (query) target.searchParams.set('q', query);
        target.hash = 'intelligence';
        location.assign(target.href);
      } else {
        const target = new URL('collection-series.html', location.href);
        const current = new URLSearchParams(location.search);
        for (const key of ['trend','direction','gender','type','material','colour','retail','occasion','season']) {
          if (current.has(key)) target.searchParams.set(key, current.get(key));
        }
        if (query) target.searchParams.set('q', query);
        location.assign(target.href);
      }
    });
  }
  const selection = document.querySelector('.header-tools [aria-label="View selection"]');
  if (selection) selection.addEventListener('click', () => location.assign('my-selection.html'));
  const contact = document.querySelector('.header-tools [aria-label="Subscribe"]');
  if (contact) {
    contact.setAttribute('aria-label', 'Contact SOHO Fashion');
    contact.title = 'Open an email draft';
    contact.addEventListener('click', () => {
      location.href = 'mailto:online@saintycorp.com?subject=' + encodeURIComponent('A/W 27/28 development enquiry') + '&body=' + encodeURIComponent('I would like to discuss this page:\n' + location.href);
    });
  }
  function updateCount() {
    const badge = document.getElementById('count');
    if (!badge) return;
    let count = 0;
    try {
      const stored = JSON.parse(localStorage.getItem('soho-collection-selection') || '[]');
      const archived = new Set(['AE-015','AE-016','AE-024','AE-027','AE-033','AE-034']);
      count = Array.isArray(stored) ? stored.filter(code => !archived.has(code)).length : 0;
    } catch { /* An unavailable store should not prevent navigation. */ }
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
  updateCount();
  window.addEventListener('storage', updateCount);
  window.addEventListener('soho:selection-change', updateCount);
})();
