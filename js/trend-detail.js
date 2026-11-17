/* Keep existing shared trend-detail.html?t= links working without fetching an obsolete catalogue. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const aliases = {
    shacket: 'OW01', shackets: 'OW01', overshirt: 'OW01',
    jacket: 'OW02', jackets: 'OW02', chore: 'OW02', 'barn-jacket': 'OW02', 'chore-jacket': 'OW02',
    bomber: 'OW03', blouson: 'OW03', harrington: 'OW04',
    quilted: 'OW05', quilting: 'PROC02', puffer: 'OW05', parka: 'OW06', shell: 'OW06',
    fleece: 'OW07', sherpa: 'OW07', coat: 'OW08', coats: 'OW08',
    shirt: 'S01', shirts: 'S01', flannel: 'S01', blouse: 'S04',
    trousers: 'T01', trouser: 'T01', pants: 'T01', tailoring: 'T01',
    cargo: 'T02', 'cargo-pants': 'T02', 'utility-trouser': 'T02',
    'wide-leg': 'T03', 'knit-trousers': 'T06', 'knit-pants': 'T06',
    jogger: 'T07', joggers: 'T07', leggings: 'T08', yoga: 'T08', 'yoga-pants': 'T08',
    corduroy: 'MAT02', checks: 'PAT01', stripes: 'PAT02', botanical: 'PAT03'
  };
  const requested = params.get('report') || params.get('id') || params.get('story');
  const report = requested || aliases[normalise(params.get('t'))];
  const target = new URL(report ? 'trend-story.html' : 'trend.html', location.href);
  if (report) target.searchParams.set('report', report);
  if (params.get('q')) target.searchParams.set('q', params.get('q'));
  target.hash = location.hash || (report ? '' : '#intelligence');
  location.replace(target.href);
})();
