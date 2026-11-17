(() => {
  'use strict';
  const film = document.querySelector('[data-hero-film]');
  const play = document.querySelector('[data-play-film]');
  if (!film || !play) return;
  const label = play.querySelector('span');
  const fallback = document.querySelector('[data-film-fallback]');
  function ready() {
    play.hidden = false;
    play.disabled = false;
    if (label) label.textContent = 'Play film';
  }
  ready();
  play.addEventListener('click', async () => {
    play.disabled = true;
    if (label) label.textContent = 'Loading film…';
    if (!film.getAttribute('src')) film.src = film.dataset.src;
    film.controls = true;
    try { await film.play(); }
    catch { ready(); }
  });
  film.addEventListener('playing', () => { play.hidden = true; });
  film.addEventListener('error', () => {
    ready();
    if (fallback) fallback.hidden = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) film.pause();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting && !film.paused) film.pause();
    }, {threshold: 0}).observe(film);
  }
})();
