(() => {
  'use strict';
  const film = document.querySelector('[data-hero-film]');
  const play = document.querySelector('[data-play-film]');
  if (!film || !play) return;
  const label = play.querySelector('span');
  const fallback = document.querySelector('[data-film-fallback]');
  let visible = true;
  let attempt = 0;
  film.muted = true;
  film.defaultMuted = true;
  function ready() {
    play.hidden = false;
    play.disabled = false;
    if (label) label.textContent = 'Play film';
  }
  async function start() {
    if (document.hidden || !visible) return;
    const current = ++attempt;
    if (!film.getAttribute('src')) film.src = film.dataset.src;
    try { await film.play(); }
    catch (error) {
      if (current === attempt && visible && !document.hidden && error.name !== 'AbortError') ready();
    }
  }
  function pause() {
    ++attempt;
    film.pause();
  }
  play.addEventListener('click', async () => {
    play.disabled = true;
    if (label) label.textContent = 'Loading film…';
    film.controls = true;
    await start();
  });
  film.addEventListener('playing', () => {
    if (document.hidden || !visible) { pause(); return; }
    play.hidden = true;
    play.disabled = false;
  });
  film.addEventListener('error', () => {
    ready();
    if (fallback) fallback.hidden = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else start();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else pause();
    }, {threshold: 0}).observe(film);
  } else start();
})();
