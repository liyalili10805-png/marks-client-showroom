(function () {
  'use strict';

  const root = document.querySelector('[data-material-app]');
  const body = document.body;
  const DATA_URL = body.dataset.materialsData || 'data/materials-library.json';
  const TREND_URL = body.dataset.trendConnections || 'data/trend-connections.json' + new URL(DATA_URL, location.href).search;
  const LIBRARY_URL = body.dataset.materialLibrary || 'products.html';
  const BOARD_URL = body.dataset.materialBoard || 'library-board.html';
  const STORIES_URL = body.dataset.materialStories || 'development-stories.html';
  const BOARD_KEY = 'soho-material-board-v1';
  const PAGE_SIZE = 25;
  const SOURCE = {global: 'Global Edit', sales: 'Sourced Materials', studio: 'SOHO Design Studio'};
  const STATUS = {reference: 'Reference Only', concept: 'Design Concept', sampling: 'Sampling in Progress', available: 'Sample Available'};
  const MATCH_TIER = {direct: 'Direct match', alternative: 'Development alternative', concept: 'Studio concept'};
  const MATCH_RANK = {direct: 0, alternative: 1, concept: 2};
  const FILTERS = [
    {key: 'family', label: 'Material / pattern'},
    {key: 'color', label: 'Colour'},
    {key: 'use', label: 'Application'},
    {key: 'developmentSeason', label: 'Development season'},
    {key: 'source', label: 'Source'},
    {key: 'status', label: 'Sample status'}
  ];
  const picked = new Set();
  const compared = new Set();
  const searchIndex = new WeakMap(), valueIndex = new WeakMap(), libraryCards = new Map();
  let boardPersistenceFailed = false;
  let items = [], byId = new Map(), board = readBoard(), state = readState();
  let matches = [], rendered = [], currentDetail = null;
  let dialog, dialogReturnFocus, toastTimer, searchTimer, groupFilter = '', sharedIds = [];
  let countedItems, counts, loading = false, lifecycleWired = false, sharedHeaderWired = false;
  let trendConnections, trendRequest = 0;
  let trendSelection = {status: 'idle', report: null, term: null, ids: new Set()};
  const pageIsBoard = body.dataset.materialPage === 'board';
  if (!root) { wireSharedHeader(); return; }
  const icons = {
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    missing: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/><circle cx="8" cy="8" r="1.5"/><path d="m3 18 6-6 4 4 3-3 5 5"/></svg>'
  };

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function button(text, className, action) {
    const n = node('button', className, text); n.type = 'button';
    if (action) n.addEventListener('click', action);
    return n;
  }
  function link(text, href, className) {
    const n = node('a', className, text); n.href = href; return n;
  }
  function list(value) {
    if (Array.isArray(value)) return value.map(v => typeof v === 'object' ? v.name || v.label || '' : String(v)).filter(Boolean);
    return value ? [String(value)] : [];
  }
  function safeImage(value) {
    let src = typeof value === 'object' && value ? value.src || value.image || value.url : value;
    if (typeof src !== 'string') return '';
    if (/^(?:javascript|data|blob):/i.test(src)) return '';
    return src;
  }
  function image(src, alt, className, eager, priority) {
    const img = node('img', className);
    img.alt = alt || ''; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async';
    img.fetchPriority = priority || 'auto';
    img.width = 600; img.height = 600;
    if (src) img.src = safeImage(src);
    img.addEventListener('error', () => {
      const missing = node('div', 'ml-image-unavailable'); missing.innerHTML = icons.missing;
      missing.append(node('span', null, 'Image temporarily unavailable'));
      img.replaceWith(missing);
    }, {once: true});
    if (!src) requestAnimationFrame(() => img.dispatchEvent(new Event('error')));
    return img;
  }
  function normalise(item, index) {
    const sourceType = ['global', 'sales', 'studio'].includes(item.sourceType) ? item.sourceType : 'global';
    const type = item.type === 'pattern' ? 'pattern' : 'fabric';
    const colorways = (item.colorways || []).map(c => ({name: c.name || list(c.colors).join(' / ') || 'Colourway', colors: list(c.colors), image: safeImage(c.image), thumbnail: safeImage(c.thumbnail), displayImage: safeImage(c.displayImage), displayThumbnail: safeImage(c.displayThumbnail), displayWidth: Number(c.displayWidth), displayThumbnailWidth: Number(c.displayThumbnailWidth), images: list(c.images)}));
    return {...item, id: String(item.id || 'M-' + (index + 1)), title: item.title || 'Material study', type,
      family: item.family || (type === 'fabric' ? 'Other fabrics' : 'Other patterns'), colors: list(item.colors),
      uses: list(item.uses), tags: list(item.tags), image: safeImage(item.image), displayImage: safeImage(item.displayImage), displayThumbnail: safeImage(item.displayThumbnail), images: item.images || [],
      sourceType, status: sourceType === 'studio' ? 'concept' : ['reference', 'sampling', 'available'].includes(item.status) ? item.status : 'reference', colorways,
      season: item.season || 'Current reference · season not specified', developmentSeasons: list(item.developmentSeasons), trendIds: list(item.trendIds), _order: index};
  }
  function readBoard() {
    try {
      const stored = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
      const arr = Array.isArray(stored) ? stored : stored.items || [];
      return new Map(arr.filter(x => x && typeof x.id === 'string').map(x => [x.id, {id: x.id, note: String(x.note || ''), group: String(x.group || ''), colorway: String(x.colorway || ''), colorwayImage: safeImage(x.colorwayImage || '')}]));
    } catch (_) { boardPersistenceFailed = true; return new Map(); }
  }
  function persist() {
    try { localStorage.setItem(BOARD_KEY, JSON.stringify([...board.values()])); boardPersistenceFailed = false; syncPersistenceNotice(); return true; }
    catch (_) { boardPersistenceFailed = true; syncPersistenceNotice(); toast('Your browser could not save this selection. Please export your board to keep a copy.'); return false; }
  }
  function syncPersistenceNotice() {
    if (!root) return;
    let notice = root.querySelector('.ml-storage-warning');
    if (!boardPersistenceFailed) { if (notice) notice.remove(); return; }
    if (!notice) { notice = node('p', 'ml-storage-warning'); notice.setAttribute('role', 'status'); root.append(notice); }
    notice.textContent = 'Browser storage is unavailable. Changes are kept in this open tab only. Export your board before closing this tab to keep your selections and notes.';
  }
  function toast(message) {
    let n = document.querySelector('.ml-toast');
    if (!n) { n = node('div', 'ml-toast'); n.setAttribute('role', 'status'); document.body.append(n); }
    clearTimeout(toastTimer); n.textContent = message; n.hidden = false;
    toastTimer = setTimeout(() => { n.hidden = true; }, 3200);
  }
  function countUpdate() {
    document.querySelectorAll('[data-material-count]').forEach(n => { n.textContent = board.size; });
    document.querySelectorAll('[data-save-id]').forEach(n => {
      const saved = board.has(n.dataset.saveId); n.setAttribute('aria-pressed', String(saved));
      const item = byId.get(n.dataset.saveId);
      if (n.classList.contains('ml-save')) n.setAttribute('aria-label', (saved ? 'Remove ' : 'Save ') + (item ? item.title : 'material') + (saved ? ' from board' : ' to board'));
      else if (n.dataset.choiceName != null) {
        const record = board.get(n.dataset.saveId), selected = saved && record.colorway === n.dataset.choiceName && (record.colorwayImage || '') === n.dataset.choiceImage;
        n.setAttribute('aria-pressed', String(selected));
        n.textContent = selected ? boardPersistenceFailed ? 'In this tab · export to keep' : 'Saved to Material Board ✓' : n.dataset.choiceName ? 'Save selected colourway' : 'Save to Material Board';
      } else n.textContent = saved ? boardPersistenceFailed ? 'In this tab · export to keep' : 'Saved to Material Board ✓' : 'Save to Material Board';
    });
    syncPersistenceNotice();
  }
  function saveItem(item, colorway, deferCommit) {
    const choice = typeof colorway === 'object' && colorway ? colorway : null;
    const name = choice ? choice.name : colorway;
    const candidates = item.colorways.filter(c => c.name === name);
    const selected = choice || (candidates.length === 1 ? candidates[0] : null);
    if (!board.has(item.id)) board.set(item.id, {id: item.id, note: '', group: '', colorway: name || '', colorwayImage: selected?.image || ''});
    else if (colorway != null) Object.assign(board.get(item.id), {colorway: name || '', colorwayImage: selected?.image || ''});
    if (!deferCommit) { const saved = persist(); countUpdate(); return saved; }
    return true;
  }
  function boardColourway(item, record) {
    if (!record?.colorway) return null;
    if (record.colorwayImage) return item.colorways.find(c => c.image === record.colorwayImage && c.name === record.colorway) || null;
    const candidates = item.colorways.filter(c => c.name === record.colorway);
    return candidates.length === 1 ? candidates[0] : null;
  }
  function toggleSave(item) {
    if (board.has(item.id)) { board.delete(item.id); if (persist()) toast('Removed from your Material Board'); }
    else if (saveItem(item)) toast('Saved to your Material Board in this browser');
    countUpdate();
  }
  function readState() {
    const params = new URLSearchParams(location.search);
    const page = Number(params.get('page'));
    const s = {type: ['fabric', 'pattern'].includes(params.get('type')) ? params.get('type') : 'all', q: params.get('q') || '', sort: ['curated', 'az'].includes(params.get('sort')) ? params.get('sort') : 'curated', page: Number.isSafeInteger(page) && page > 0 ? page : 1, trend: params.has('trend') ? params.get('trend') : null, direction: params.has('direction') ? params.get('direction') : null};
    FILTERS.forEach(f => { s[f.key] = new Set(params.getAll(f.key).flatMap(v => v.split('|')).filter(Boolean)); });
    return s;
  }
  function writeState(replace) {
    const params = new URLSearchParams();
    if (hasTrendSelection()) {
      params.set('trend', state.trend);
      if (state.direction !== null) params.set('direction', state.direction);
    }
    if (state.type !== 'all') params.set('type', state.type);
    if (state.q) params.set('q', state.q);
    FILTERS.forEach(f => { [...state[f.key]].forEach(v => params.append(f.key, v)); });
    if (state.sort !== 'curated') params.set('sort', state.sort);
    if (state.page > 1) params.set('page', state.page);
    const next = location.pathname + (params.size ? '?' + params.toString() : '');
    if (next !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState']({}, '', next);
  }
  function searchText(item) {
    if (!searchIndex.has(item)) searchIndex.set(item, [item.id, item.title, item.family, item.structure, item.technique, item.displayLabel, ...item.colors, ...item.uses, ...item.tags].join(' ').toLocaleLowerCase());
    return searchIndex.get(item);
  }
  function valuesFor(item, key) {
    if (!valueIndex.has(item)) valueIndex.set(item, {color: [...new Set([...item.colors, ...item.colorways.flatMap(c => c.colors)])], use: item.uses, developmentSeason: item.developmentSeasons, source: [item.sourceType], family: [item.family], status: [item.status]});
    return valueIndex.get(item)[key] || [item[key]];
  }
  function totals() {
    if (countedItems !== items) { counts = {fabric: 0, pattern: 0}; items.forEach(item => { counts[item.type]++; }); countedItems = items; }
    return counts;
  }
  function labelFor(key, value) { return key === 'source' ? SOURCE[value] || value : key === 'status' ? STATUS[value] || value : value; }
  function hasTrendSelection() { return !pageIsBoard && state.trend !== null; }
  function trendPool() {
    if (!hasTrendSelection()) return items;
    return trendSelection.status === 'ready' ? items.filter(item => trendSelection.ids.has(item.id)) : [];
  }
  function scopeTotals() {
    if (!hasTrendSelection()) return totals();
    const scoped = {fabric: 0, pattern: 0}; trendPool().forEach(item => { scoped[item.type]++; }); return scoped;
  }
  function materialMatchTier(term, item) {
    if (item.sourceType === 'studio') return 'concept';
    return term.tier === 'direct' ? 'direct' : 'alternative';
  }
  function materialMatchRationale(term, item) {
    if (typeof term.rationale === 'string' && term.rationale.trim() && (term.tier !== 'concept' || item.sourceType === 'studio')) return term.rationale.trim();
    return item.sourceType === 'studio' ? 'Digital design concept; cloth construction and a physical sample remain to be developed.' : 'A development reference for this direction; the intended construction, finish and application need to be confirmed on a sample.';
  }
  function buildMaterialMatches(terms) {
    const entries = new Map();
    terms.forEach(term => term.ids.forEach(id => {
      const item = byId.get(id); if (!item) return;
      const entry = {tier: materialMatchTier(term, item), rationale: materialMatchRationale(term, item)};
      if (!entries.has(id)) entries.set(id, []); entries.get(id).push(entry);
    }));
    const result = new Map();
    entries.forEach((links, id) => {
      links.sort((a, b) => MATCH_RANK[a.tier] - MATCH_RANK[b.tier]);
      const tier = links[0].tier;
      const rationales = [...new Set(links.filter(entry => entry.tier === tier).map(entry => entry.rationale))].slice(0, 2);
      result.set(id, {tier, rationales});
    });
    return result;
  }
  function matchFor(item) { return hasTrendSelection() && trendSelection.status === 'ready' ? trendSelection.matchById?.get(item.id) : null; }
  function syncCardMatch(article, item) {
    if (article.classList.contains('ml-board-card')) return;
    const previous = article.querySelector('.ml-match-context'), match = matchFor(item);
    if (!match) { if (previous) previous.remove(); delete article.dataset.matchTier; delete article.dataset.matchContext; return; }
    const signature = JSON.stringify([state.trend, state.direction, match.tier, match.rationales]);
    if (previous && article.dataset.matchContext === signature) return;
    const context = node('div', 'ml-match-context');
    context.append(node('span', 'ml-match-tier ml-match-tier--' + match.tier, MATCH_TIER[match.tier]));
    match.rationales.forEach(reason => context.append(node('p', 'ml-match-reason', reason)));
    article.dataset.matchTier = match.tier; article.dataset.matchContext = signature;
    if (previous) previous.replaceWith(context); else article.append(context);
  }
  async function resolveTrendSelection(retry) {
    const request = ++trendRequest;
    trendSelection = {status: hasTrendSelection() ? 'loading' : 'idle', report: null, term: null, ids: new Set()};
    if (!hasTrendSelection()) return;
    const reportId = state.trend, direction = state.direction;
    try {
      if (retry) trendConnections = null;
      if (!trendConnections) trendConnections = fetch(TREND_URL).then(async response => {
        if (!response.ok) throw new Error('Trend connections unavailable');
        const data = await response.json();
        if (!data || data.season !== 'A/W 27/28' || !data.reports || typeof data.reports !== 'object') throw new Error('Invalid trend connections');
        return data;
      }).catch(error => { trendConnections = null; throw error; });
      const data = await trendConnections;
      if (request !== trendRequest) return;
      const report = Object.prototype.hasOwnProperty.call(data.reports, reportId) ? data.reports[reportId] : null;
      if (!report) { trendSelection.status = 'unknown-report'; return; }
      if (report.id !== reportId || typeof report.title !== 'string' || !Array.isArray(report.materialTerms)) throw new Error('Invalid report connection');
      trendSelection.report = report;
      if (!report.materialTerms.every(term => term && typeof term.key === 'string' && typeof term.label === 'string' && Array.isArray(term.ids))) throw new Error('Invalid material connections');
      const term = direction === null ? null : report.materialTerms.find(entry => entry.key === direction);
      if (direction !== null && !term) { trendSelection.status = 'unknown-direction'; return; }
      const selectedTerms = term ? [term] : report.materialTerms;
      const matchById = buildMaterialMatches(selectedTerms);
      trendSelection = {status: 'ready', report, term, ids: new Set(matchById.keys()), matchById};
    } catch (_) {
      if (request === trendRequest) trendSelection = {...trendSelection, status: 'unavailable', ids: new Set()};
    }
  }
  function clearTrendSelection() {
    state.trend = null; state.direction = null; trendRequest++;
    trendSelection = {status: 'idle', report: null, term: null, ids: new Set()};
    libraryCards.forEach((article, id) => syncCardMatch(article, byId.get(id)));
    updateLibrary();
  }
  function trendBackLink() {
    return state.trend && trendSelection.status !== 'unknown-report' ? 'trend-story.html?report=' + encodeURIComponent(state.trend) : 'trend.html#intelligence';
  }
  function trendBackLabel() { return state.trend && trendSelection.status !== 'unknown-report' ? 'Back to report ↗' : 'Back to research ↗'; }
  function renderTrendContext() {
    const previous = root.querySelector('.ml-trend-context');
    if (!hasTrendSelection()) { if (previous) previous.remove(); return; }
    const context = node('section', 'ml-trend-context'); context.setAttribute('aria-labelledby', 'ml-trend-title');
    const copy = node('div', 'ml-trend-copy');
    copy.append(node('p', 'ml-trend-eyebrow', 'From trend research / A/W 27/28'));
    const title = node('h2', null, trendSelection.report ? trendSelection.report.title : 'Trend selection'); title.id = 'ml-trend-title'; copy.append(title);
    const label = trendSelection.status === 'loading' ? 'Loading the linked materials…' : trendSelection.status === 'unknown-direction' ? 'Material direction unavailable' : trendSelection.term ? trendSelection.term.label : trendSelection.status === 'ready' ? 'All linked references' : 'The requested selection could not be loaded';
    copy.append(node('p', 'ml-trend-direction', label));
    if (trendSelection.status === 'ready') {
      const tierCounts = {direct: 0, alternative: 0, concept: 0}; trendSelection.matchById.forEach(match => { tierCounts[match.tier]++; });
      if (trendSelection.term) {
        const activeTiers = Object.keys(tierCounts).filter(tier => tierCounts[tier]);
        const tier = activeTiers.length === 1 ? activeTiers[0] : null;
        copy.append(node('span', 'ml-trend-tier' + (tier ? ' ml-match-tier--' + tier : ''), tier ? MATCH_TIER[tier] : 'Linked development references'));
        const firstItem = trendPool()[0];
        if (firstItem) copy.append(node('p', 'ml-trend-rationale', materialMatchRationale(trendSelection.term, firstItem)));
      } else {
        copy.append(node('p', 'ml-trend-breakdown', Object.keys(tierCounts).filter(tier => tierCounts[tier]).map(tier => tierCounts[tier] + ' ' + (tier === 'direct' ? 'direct matches' : tier === 'alternative' ? 'development alternatives' : 'studio concepts')).join(' · ')));
        copy.append(node('p', 'ml-trend-rationale', 'Direct matches, development alternatives and digital concepts retain their own labels and reasons below.'));
      }
    }
    const actions = node('div', 'ml-trend-actions');
    actions.append(link(trendBackLabel(), trendBackLink(), 'ml-trend-back'), button('Clear trend selection', 'ml-trend-clear', clearTrendSelection));
    context.append(copy, actions);
    if (previous) previous.replaceWith(context); else root.querySelector('.ml-heading').after(context);
  }
  function trendEmpty() {
    const empty = node('div', 'ml-empty ml-trend-empty');
    let title = 'No linked materials yet.', message = 'This direction does not have any materials in the current library. Return to the report or clear the trend selection to browse the library.';
    if (trendSelection.status === 'loading') { title = 'Loading this trend selection…'; message = 'The linked materials will appear here when the selection is ready.'; }
    else if (trendSelection.status === 'unknown-report') { title = 'This trend report could not be found.'; message = 'The requested report does not have a current material selection. Return to research or clear the trend selection.'; }
    else if (trendSelection.status === 'unknown-direction') { title = 'This material direction is unavailable.'; message = 'This keyword is not linked to materials in the requested report. Return to the report to choose another direction.'; }
    else if (trendSelection.status === 'unavailable') { title = 'This trend selection is temporarily unavailable.'; message = 'The linked materials could not be loaded. Please try again or return to the report.'; }
    empty.append(node('h2', null, title), node('p', null, message));
    if (trendSelection.status === 'unavailable') empty.append(button('Try again', 'ml-button', async () => { const pending = resolveTrendSelection(true); updateLibrary(true, true); await pending; updateLibrary(true, true); }));
    if (trendSelection.status !== 'loading') empty.append(link(trendBackLabel(), trendBackLink(), 'ml-button'), button('Clear trend selection', 'ml-button ml-button--quiet', clearTrendSelection));
    return empty;
  }
  function filtered() {
    const terms = state.q.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    let result = trendPool().filter(item => (state.type === 'all' || item.type === state.type)
      && terms.every(t => searchText(item).includes(t))
      && FILTERS.every(f => !state[f.key].size || valuesFor(item, f.key).some(v => state[f.key].has(v))));
    if (state.sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (hasTrendSelection() && trendSelection.status === 'ready') result.sort((a, b) => MATCH_RANK[matchFor(a).tier] - MATCH_RANK[matchFor(b).tier] || a._order - b._order);
    return result;
  }
  function heading(title, intro, eyebrow) {
    const h = node('div', 'ml-heading'), copy = node('div');
    copy.append(node('p', 'ml-eyebrow', eyebrow || 'SOHO Fashion / Material Library'), node('h1', null, title), node('p', 'ml-intro', intro));
    const links = node('nav', 'ml-toplinks'); links.setAttribute('aria-label', 'Material library navigation');
    if (pageIsBoard) links.append(link('Browse the library ↗', LIBRARY_URL));
    links.append(link('Development Stories ↗', STORIES_URL));
    if (!pageIsBoard) {
      const b = link('', BOARD_URL, 'ml-board-link'); b.append(node('span', null, 'Material Board'));
      const c = node('span', 'ml-count-pill', board.size); c.dataset.materialCount = ''; b.append(c); links.append(b);
    } else links.append(link('Style selection ↗', 'my-selection.html'));
    h.append(copy, links); return h;
  }

  function renderLibrary() {
    root.replaceChildren(heading('Materials & Patterns', 'Explore cloth, colour and pattern. Build your next material selection.'));
    const mainbar = node('div', 'ml-mainbar'), tabs = node('div', 'ml-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Library type');
    [['all', 'All materials'], ['fabric', 'Fabrics'], ['pattern', 'Patterns']].forEach(([value, text]) => {
      const b = button('', 'ml-tab', () => { state.type = value; updateLibrary(); });
      b.setAttribute('role', 'tab'); b.dataset.type = value;
      b.append(node('span', null, text), node('span', 'ml-tab-count', value === 'all' ? items.length : totals()[value]));
      tabs.append(b);
    });
    tabs.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const all = [...tabs.querySelectorAll('button')], current = all.indexOf(document.activeElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
      e.preventDefault(); all[next].click(); all[next].focus();
    });
    const search = node('form', 'ml-search'); search.setAttribute('role', 'search'); search.innerHTML = icons.search;
    const input = node('input'); input.type = 'search'; input.placeholder = 'Search fabrics, patterns, colours or codes'; input.setAttribute('aria-label', 'Search materials and patterns'); input.id = 'ml-search';
    input.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = input.value.trim(); updateLibrary(true); }, 160); });
    search.addEventListener('submit', e => { e.preventDefault(); clearTimeout(searchTimer); state.q = input.value.trim(); updateLibrary(true); });
    search.append(input); mainbar.append(tabs, search); root.append(mainbar);
    const filters = node('div', 'ml-filters'); filters.setAttribute('aria-label', 'Filter materials');
    FILTERS.forEach(f => {
      const detail = node('details', 'ml-filter'); detail.dataset.filterKey = f.key;
      const summary = node('summary'); summary.append(node('span', null, f.label), node('span', 'ml-filter-count')); detail.append(summary);
      const pop = node('div', 'ml-filter-pop');
      const counts = new Map();
      items.forEach(i => valuesFor(i, f.key).forEach(v => { if (v) counts.set(v, (counts.get(v) || 0) + 1); }));
      if (f.key === 'source') Object.keys(SOURCE).forEach(k => { if (!counts.has(k)) counts.set(k, 0); });
      [...counts.keys()].sort((a, b) => labelFor(f.key, a).localeCompare(labelFor(f.key, b))).forEach(value => {
        const label = node('label'), check = node('input'); check.type = 'checkbox'; check.value = value; check.dataset.filter = f.key;
        check.addEventListener('change', () => { if (check.checked) state[f.key].add(value); else state[f.key].delete(value); updateLibrary(); });
        label.append(check, node('span', null, labelFor(f.key, value)), node('span', 'ml-option-count', counts.get(value))); pop.append(label);
      });
      detail.append(pop); detail.addEventListener('toggle', () => { if (detail.open) filters.querySelectorAll('details').forEach(d => { if (d !== detail) d.open = false; }); }); filters.append(detail);
    });
    filters.append(node('span', 'ml-filter-note', 'A considered library for everyday development')); root.append(filters);
    root.append(node('div', 'ml-chips'));
    const meta = node('div', 'ml-library-meta ml-results-start'), count = node('p', 'ml-result-count'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
    const viewtools = node('div', 'ml-viewtools'), label = node('label'), check = node('input');
    check.type = 'checkbox'; check.id = 'ml-select-visible'; check.addEventListener('change', () => { rendered.forEach(i => { if (check.checked) picked.add(i.id); else picked.delete(i.id); }); syncPicked(); });
    label.append(check, document.createTextNode('Select visible')); viewtools.append(label);
    const sort = node('select'); sort.setAttribute('aria-label', 'Sort materials');
    [['curated', 'Library order'], ['az', 'Name: A–Z']].forEach(([value, text]) => { const o = node('option', null, text); o.value = value; sort.append(o); });
    sort.id = 'ml-sort'; sort.addEventListener('change', () => { state.sort = sort.value; updateLibrary(); }); viewtools.append(sort);
    meta.append(count, viewtools); root.append(meta);
    const topPager = node('nav', 'ml-pagination'); topPager.dataset.pagination = 'top'; topPager.setAttribute('aria-label', 'Material result pages, top');
    const grid = node('div', 'ml-grid'); grid.id = 'ml-material-grid'; grid.setAttribute('aria-label', 'Materials and patterns');
    const bottomPager = node('nav', 'ml-pagination'); bottomPager.dataset.pagination = 'bottom'; bottomPager.setAttribute('aria-label', 'Material result pages, bottom');
    root.append(topPager, grid, bottomPager);
    const foot = node('div', 'ml-library-footnote');
    foot.append(node('p', null, 'Reference materials, physical samples and digital concepts are identified separately. Your board and development notes are saved only in this browser. Export a copy to keep or share your notes.'), link('How we develop materials ↗', STORIES_URL)); root.append(foot);
    updateLibrary(true, true);
  }
  function syncControls() {
    const scoped = scopeTotals();
    root.querySelectorAll('[data-type]').forEach(b => { const active = b.dataset.type === state.type; b.setAttribute('aria-selected', String(active)); b.tabIndex = active ? 0 : -1; b.querySelector('.ml-tab-count').textContent = b.dataset.type === 'all' ? scoped.fabric + scoped.pattern : scoped[b.dataset.type]; });
    root.querySelector('#ml-search').value = state.q;
    root.querySelector('#ml-sort').value = state.sort;
    root.querySelectorAll('[data-filter]').forEach(check => { check.checked = state[check.dataset.filter].has(check.value); });
    root.querySelectorAll('[data-filter-key]').forEach(d => { const n = state[d.dataset.filterKey].size, b = d.querySelector('.ml-filter-count'); b.textContent = n; b.hidden = !n; });
  }
  function updateLibrary(replace, initial) {
    if (!initial) state.page = 1;
    matches = filtered(); state.page = clampPage(state.page); syncControls(); renderTrendContext(); renderChips(); renderGrid();
    writeState(replace || initial);
  }
  function renderChips() {
    const chips = root.querySelector('.ml-chips'); chips.replaceChildren();
    const add = (text, action) => { const b = button('', 'ml-chip', action); b.append(node('span', null, text), node('span', null, '×')); b.setAttribute('aria-label', 'Remove filter: ' + text); chips.append(b); };
    if (state.q) add('Search: ' + state.q, () => { state.q = ''; updateLibrary(); });
    FILTERS.forEach(f => state[f.key].forEach(v => add(labelFor(f.key, v), () => { state[f.key].delete(v); updateLibrary(); })));
    if (state.type !== 'all') add(state.type === 'fabric' ? 'Fabrics' : 'Patterns', () => { state.type = 'all'; updateLibrary(); });
    if (chips.childElementCount) chips.append(button('Clear all', 'ml-text-button', resetFilters));
    chips.hidden = !chips.childElementCount;
  }
  function resetFilters() {
    const {trend, direction} = state;
    state = {type: 'all', q: '', sort: 'curated', page: 1, trend, direction}; FILTERS.forEach(f => { state[f.key] = new Set(); }); updateLibrary();
  }
  function pageCount() { return Math.max(1, Math.ceil(matches.length / PAGE_SIZE)); }
  function clampPage(page) {
    const requested = Math.max(1, Number.isSafeInteger(page) ? page : 1);
    return hasTrendSelection() && trendSelection.status === 'loading' ? requested : Math.min(pageCount(), requested);
  }
  function pageNumbers() {
    const total = pageCount(), pages = new Set([1, total, state.page - 1, state.page, state.page + 1]);
    if (state.page <= 3) [2, 3, 4].forEach(p => pages.add(p));
    if (state.page >= total - 2) [total - 3, total - 2, total - 1].forEach(p => pages.add(p));
    return [...pages].filter(p => p > 0 && p <= total).sort((a, b) => a - b);
  }
  function scrollResults() { root.querySelector('.ml-results-start')?.scrollIntoView({block: 'start'}); }
  function goToPage(page, position) {
    const next = clampPage(page); if (next === state.page) return;
    state.page = next; renderGrid(); writeState();
    requestAnimationFrame(() => {
      if (position) root.querySelector('[data-pagination="' + position + '"] [aria-current="page"]')?.focus({preventScroll: true});
      scrollResults();
    });
  }
  function renderPagination() {
    const total = pageCount(), first = (state.page - 1) * PAGE_SIZE + 1, last = Math.min(state.page * PAGE_SIZE, matches.length);
    root.querySelectorAll('.ml-pagination').forEach(pager => {
      pager.replaceChildren(); pager.hidden = !matches.length; if (!matches.length) return;
      const summary = node('div', 'ml-page-summary');
      summary.append(node('span', 'ml-page-range', first.toLocaleString() + '–' + last.toLocaleString() + ' of ' + matches.length.toLocaleString()), node('span', 'ml-page-position', 'Page ' + state.page + ' of ' + total));
      const controls = node('div', 'ml-page-controls');
      const pageButton = (text, page, label, current) => {
        const b = button(text, 'ml-page-button', () => goToPage(page, pager.dataset.pagination));
        b.setAttribute('aria-label', label); b.setAttribute('aria-controls', 'ml-material-grid');
        if (current) b.setAttribute('aria-current', 'page'); return b;
      };
      const previous = pageButton('Prev', state.page - 1, 'Previous page'); previous.disabled = state.page === 1; controls.append(previous);
      let previousNumber = 0;
      pageNumbers().forEach(page => {
        if (previousNumber && page - previousNumber > 1) { const dots = node('span', 'ml-page-ellipsis', '…'); dots.setAttribute('aria-hidden', 'true'); controls.append(dots); }
        controls.append(pageButton(String(page), page, 'Page ' + page, page === state.page)); previousNumber = page;
      });
      const next = pageButton('Next', state.page + 1, 'Next page'); next.disabled = state.page === total; controls.append(next);
      pager.append(summary, controls);
    });
  }
  function renderGrid() {
    state.page = clampPage(state.page);
    const previous = rendered;
    rendered = matches.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    const grid = root.querySelector('.ml-grid');
    const unchanged = rendered.length && grid.children.length && previous.length === rendered.length && rendered.every((item, i) => previous[i].id === item.id);
    const scoped = scopeTotals();
    const count = root.querySelector('.ml-result-count'); count.replaceChildren(node('strong', null, matches.length.toLocaleString() + (matches.length === 1 ? ' material' : ' materials')),
      document.createTextNode(' · ' + scoped.fabric + ' fabrics / ' + scoped.pattern + ' patterns ' + (hasTrendSelection() ? 'in this trend selection' : 'in the library')));
    if (!matches.length) {
      if (hasTrendSelection() && (trendSelection.status !== 'ready' || !trendSelection.ids.size)) grid.replaceChildren(trendEmpty());
      else { const empty = node('div', 'ml-empty'); empty.append(node('h2', null, 'A different combination?'), node('p', null, hasTrendSelection() ? 'No materials match these filters within this trend selection. Try a broader colour, application or material family.' : 'No materials match these filters. Try a broader colour, application or material family.'), button('Clear filters', 'ml-button', resetFilters)); grid.replaceChildren(empty); }
    } else if (!unchanged) grid.replaceChildren(...rendered.map(cachedLibraryCard));
    else rendered.forEach((item, index) => syncCardMatch(grid.children[index], item));
    renderPagination();
    syncPicked(); countUpdate();
  }
  function previewFor(item, colourway) { return colourway ? colourway.displayThumbnail || colourway.displayImage || colourway.thumbnail || colourway.image || item.displayThumbnail || item.displayImage || item.thumbnail || item.image : item.displayThumbnail || item.displayImage || item.thumbnail || item.image; }
  function prioritiseCard(article, position) {
    const img = article.querySelector('img'); if (!img) return;
    const width = window.innerWidth || 1440, row = width < 700 ? 2 : width < 1000 ? 3 : width >= 1700 ? 5 : 4;
    img.loading = position < row ? 'eager' : 'lazy'; img.fetchPriority = position === 0 ? 'high' : position < row ? 'auto' : 'low';
    img.width = 400; img.height = 400;
  }
  function cachedLibraryCard(item, position) {
    const cached = libraryCards.get(item.id), article = cached || card(item);
    if (cached) syncCardMatch(article, item);
    libraryCards.delete(item.id); libraryCards.set(item.id, article); prioritiseCard(article, position);
    while (libraryCards.size > PAGE_SIZE * 3) libraryCards.delete(libraryCards.keys().next().value);
    return article;
  }
  function card(item, boardMode, position) {
    const article = node('article', boardMode ? 'ml-board-card' : 'ml-card'); article.dataset.materialId = item.id; article.dataset.materialType = item.type;
    const media = node('div', 'ml-card-media'), open = button('', 'ml-open', () => openDetail(item.id));
    const savedColourway = boardMode ? boardColourway(item, board.get(item.id)) : null;
    open.setAttribute('aria-label', 'View ' + item.title);
    const preview = image(previewFor(item, savedColourway), item.title, 'ml-card-image');
    const presentation = savedColourway || item;
    if (presentation.displayThumbnail && presentation.displayImage && Number(presentation.displayWidth) > Number(presentation.displayThumbnailWidth)) {
      preview.sizes = '(max-width: 699px) calc((100vw - 36px) / 2), (max-width: 999px) 31vw, (min-width: 1700px) 310px, 24vw';
      preview.srcset = safeImage(presentation.displayThumbnail) + ' ' + Number(presentation.displayThumbnailWidth) + 'w, ' + safeImage(presentation.displayImage) + ' ' + Number(presentation.displayWidth) + 'w';
    }
    open.append(preview); media.append(open);
    const save = button('', 'ml-save', e => { e.stopPropagation(); toggleSave(item); if (pageIsBoard) renderBoard(); });
    save.innerHTML = icons.save; save.dataset.saveId = item.id; save.setAttribute('aria-pressed', String(board.has(item.id))); media.append(save);
    if (!boardMode) {
      const label = node('label', 'ml-pick'), pick = node('input'); pick.type = 'checkbox'; pick.dataset.pickId = item.id; pick.setAttribute('aria-label', 'Select ' + item.title);
      pick.checked = picked.has(item.id); pick.addEventListener('change', () => { if (pick.checked) picked.add(item.id); else picked.delete(item.id); syncPicked(); }); label.append(pick); media.append(label);
    }
    article.append(media);
    const meta = node('div', 'ml-card-meta'); meta.append(node('span', null, item.type === 'fabric' ? 'Fabric' : 'Pattern'), node('span', null, item.id)); article.append(meta);
    const h3 = node('h3', 'ml-card-title'); h3.append(button(item.title, 'ml-title-button', () => openDetail(item.id))); article.append(h3);
    if (item.displayLabel) article.append(node('p', 'ml-surface-label', item.displayLabel));
    const foot = node('div', 'ml-card-foot');
    foot.append(node('p', null, item.family + (item.colorways.length > 1 ? ' · ' + item.colorways.length + ' colourways' : '')));
    const c = button(compared.has(item.id) ? 'Comparing ✓' : 'Compare +', 'ml-card-compare', () => toggleCompare(item)); c.dataset.compareId = item.id; c.setAttribute('aria-pressed', String(compared.has(item.id))); foot.append(c); article.append(foot);
    if (item.sourceType === 'studio') article.append(node('p', 'ml-ai-note', 'AI-assisted design · digital concept'));
    else article.append(node('p', 'ml-card-status', STATUS[item.status]));
    if (boardMode) {
      const record = board.get(item.id) || {note: '', group: '', colorway: ''};
      if (record.colorway) article.append(node('p', 'ml-ai-note', 'Selected colourway: ' + record.colorway + (savedColourway ? '' : ' · Open details and reselect this colourway.')));
      const groupLabel = node('label', 'ml-note-label', 'Board group'); groupLabel.htmlFor = 'ml-group-' + item.id;
      const group = node('input'); group.type = 'text'; group.id = groupLabel.htmlFor; group.value = record.group; group.placeholder = 'e.g. Shirts / muted checks'; group.maxLength = 80;
      group.addEventListener('input', () => { const row = board.get(item.id); if (row) { row.group = group.value.trim(); persist(); } });
      group.addEventListener('change', updateGroupOptions);
      const noteLabel = node('label', 'ml-note-label', 'Development note'); noteLabel.htmlFor = 'ml-note-' + item.id;
      const note = node('textarea'); note.id = noteLabel.htmlFor; note.value = record.note; note.placeholder = 'Colour, scale, handle or intended application…'; note.maxLength = 2000;
      note.addEventListener('input', () => { const row = board.get(item.id); if (row) { row.note = note.value; persist(); } });
      const actions = node('div', 'ml-board-card-actions'); actions.append(button('View details ↗', '', () => openDetail(item.id)), button('Remove', '', () => { board.delete(item.id); persist(); renderBoard(); }));
      article.append(groupLabel, group, noteLabel, note, actions);
    }
    if (!boardMode) syncCardMatch(article, item);
    prioritiseCard(article, position); return article;
  }
  function syncPicked() {
    root.querySelectorAll('[data-pick-id]').forEach(c => { c.checked = picked.has(c.dataset.pickId); });
    const all = root.querySelector('#ml-select-visible');
    if (all) { all.checked = !!rendered.length && rendered.every(i => picked.has(i.id)); all.indeterminate = rendered.some(i => picked.has(i.id)) && !all.checked; all.disabled = !rendered.length; }
    document.querySelectorAll('[data-compare-id]').forEach(b => { const active = compared.has(b.dataset.compareId); b.textContent = active ? 'Comparing ✓' : 'Compare +'; b.setAttribute('aria-pressed', String(active)); });
    renderBulkbar();
  }
  function renderBulkbar() {
    let bar = document.querySelector('.ml-bulkbar');
    if (!picked.size && !compared.size) { if (bar) bar.remove(); return; }
    if (!bar) { bar = node('div', 'ml-bulkbar'); bar.setAttribute('aria-label', 'Selection actions'); document.body.append(bar); }
    bar.replaceChildren();
    if (picked.size) {
      bar.append(node('span', 'ml-bulk-count', picked.size + ' selected'), button('Save selected', 'ml-bulk-save', () => {
        const n = picked.size; picked.forEach(id => { const i = byId.get(id); if (i) saveItem(i, undefined, true); }); const saved = persist(); countUpdate(); picked.clear(); syncPicked(); if (saved) toast(n + ' materials saved to your board in this browser');
      }));
    }
    if (compared.size) bar.append(button('Compare (' + compared.size + '/4)', '', openCompare));
    bar.append(button('Material Board (' + board.size + ') ↗', '', () => { location.href = BOARD_URL; }));
    const clear = button('×', '', () => { picked.clear(); compared.clear(); syncPicked(); }); clear.setAttribute('aria-label', 'Clear temporary selection and comparison'); bar.append(clear);
  }
  function toggleCompare(item) {
    if (compared.has(item.id)) compared.delete(item.id);
    else if (compared.size < 4) compared.add(item.id);
    else { toast('Compare up to four materials at a time. Remove one to add another.'); return; }
    syncPicked();
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = node('dialog', 'ml-dialog'); dialog.setAttribute('aria-label', 'Material details'); document.body.append(dialog);
    dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(); } });
    dialog.addEventListener('close', () => { body.style.overflow = ''; currentDetail = null; if (dialogReturnFocus && dialogReturnFocus.isConnected) dialogReturnFocus.focus({preventScroll: true}); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
      if (e.key === 'Tab') {
        const focusable = [...dialog.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')].filter(n => n.offsetParent !== null);
        if (!focusable.length) return;
        if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
        if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) { e.preventDefault(); focusable[0].focus(); }
      }
    });
    return dialog;
  }
  function showDialog(title) {
    const d = ensureDialog();
    if (!d.open) { dialogReturnFocus = document.activeElement; d.showModal(); body.style.overflow = 'hidden'; }
    d.setAttribute('aria-label', title); d.scrollTop = 0;
    return d;
  }
  function closeDialog() { if (dialog && dialog.open) dialog.close(); }
  function closeButton() {
    const b = button('×', 'ml-dialog-close', closeDialog); b.setAttribute('aria-label', 'Close dialog'); return b;
  }
  function galleryFor(item) {
    const gallery = [{src: item.image, thumbnail: item.thumbnail, caption: item.imageCaption || (item.sourceType === 'studio' ? 'AI-assisted design concept' : 'Published material reference')}];
    (item.images || []).forEach(v => { const src = safeImage(v); if (src && !gallery.some(x => x.src === src)) gallery.push({src, thumbnail: safeImage(typeof v === 'object' ? v.thumbnail : '') || item.colorways.find(c => c.image === src)?.thumbnail, caption: typeof v === 'object' ? v.caption || v.alt || '' : ''}); });
    return gallery;
  }
  function openDetail(id) {
    const item = byId.get(id); if (!item) return;
    currentDetail = id;
    const d = ensureDialog(); d.replaceChildren(closeButton());
    const layout = node('div', 'ml-detail-layout'), visual = node('div', 'ml-detail-visual'), gallery = galleryFor(item);
    const initialColourway = boardColourway(item, board.get(id));
    let selectedColorway = initialColourway || null, choices;
    const zoom = button('', 'ml-detail-zoom'); zoom.setAttribute('aria-label', 'Enlarge material image');
    zoom.setAttribute('aria-pressed', 'false');
    zoom.addEventListener('click', () => { const active = zoom.classList.toggle('is-zoomed'); zoom.setAttribute('aria-label', active ? 'Reduce material image' : 'Enlarge material image'); zoom.setAttribute('aria-pressed', String(active)); });
    const mainImage = image(initialColourway?.image || item.image, item.title, 'ml-detail-mainimage', true, 'high'); zoom.append(mainImage);
    const caption = node('p', 'ml-detail-image-caption', initialColourway?.image ? initialColourway.name : gallery[0].caption); visual.append(zoom, caption);
    const replaceImage = (src, text) => { zoom.classList.remove('is-zoomed'); zoom.setAttribute('aria-label', 'Enlarge material image'); zoom.setAttribute('aria-pressed', 'false'); zoom.replaceChildren(image(src, item.title, 'ml-detail-mainimage', true, 'high')); caption.textContent = text || ''; };
    const syncColourwayControls = () => {
      if (choices) choices.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.colourwayImage === selectedColorway?.image)));
      save.dataset.choiceName = selectedColorway?.name || ''; save.dataset.choiceImage = selectedColorway?.image || ''; countUpdate();
    };
    if (gallery.length > 1) {
      const thumbs = node('div', 'ml-thumbnails'); thumbs.setAttribute('aria-label', 'Material image views');
      gallery.forEach((g, index) => {
        const b = button('', '', () => { replaceImage(g.src, g.caption); selectedColorway = item.colorways.find(c => c.image === g.src) || null; syncColourwayControls(); thumbs.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); });
        b.setAttribute('aria-label', 'View image ' + (index + 1)); b.setAttribute('aria-pressed', String(g.src === (initialColourway?.image || item.image))); b.append(image(g.thumbnail || g.src, '', '', true)); thumbs.append(b);
      }); visual.append(thumbs);
    }
    const copy = node('div', 'ml-detail-copy');
    copy.append(node('p', 'ml-detail-code', (item.type === 'fabric' ? 'Fabric' : 'Pattern') + ' / ' + item.id), node('h2', null, item.title));
    copy.append(node('p', 'ml-detail-desc', item.description || 'A material reference selected for further exploration in everyday apparel.'));
    copy.append(node('p', 'ml-status ml-status--' + item.status, STATUS[item.status]));
    const fields = node('dl', 'ml-detail-fields');
    [['Family', item.family], ['Structure', item.structure || item.technique], ['Colour', item.colors.join(' / ')], ['Application', item.uses.join(' / ')], ['Development season', item.developmentSeasons.join(' / ')], ['Source season', item.season], ['Library source', SOURCE[item.sourceType]]].forEach(([key, value]) => {
      if (!value) return;
      const row = node('div'); row.append(node('dt', null, key), node('dd', null, value)); fields.append(row);
    }); copy.append(fields);
    if (item.colorways.length) {
      copy.append(node('p', 'ml-note-label', 'Colourways'));
      choices = node('div', 'ml-detail-choices');
      item.colorways.forEach((c, index) => {
        const sameName = item.colorways.filter(other => other.name === c.name).length > 1;
        const label = c.name + (sameName ? ' · ' + (index + 1) : '');
        const b = button('', '', () => { selectedColorway = c; if (c.image) replaceImage(c.image, label); syncColourwayControls(); });
        b.dataset.colourwayImage = c.image; b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', String(selectedColorway?.image === c.image));
        b.append(image(previewFor(item, c), '', '', true), node('span', null, label)); choices.append(b);
      }); copy.append(choices);
      if (board.get(id)?.colorway && !initialColourway) copy.append(node('p', 'ml-detail-scope', 'Your earlier colourway name is ambiguous or no longer listed. Select the pictured colourway and save it again to retain the exact reference.'));
    }
    const actions = node('div', 'ml-detail-actions');
    const save = button('Save to Material Board', 'ml-button ml-button--dark', () => { const saved = saveItem(item, selectedColorway || ''); if (saved) toast('Saved to your Material Board in this browser'); if (pageIsBoard) renderBoard(); }); save.dataset.saveId = id; actions.append(save);
    actions.append(button(compared.has(id) ? 'Comparing ✓' : 'Compare +', 'ml-button ml-button--quiet', () => toggleCompare(item))); actions.lastChild.dataset.compareId = id;
    copy.append(actions, link('Open Material Board ↗', BOARD_URL, 'ml-trend-links'));
    const scope = item.sourceType === 'studio' ? 'AI-assisted digital design. Colours, repeat and production translation require sample development.'
      : item.status === 'available' ? 'Physical sample availability has been recorded. Confirm the intended colour and development requirements when requesting a sample.'
      : item.status === 'sampling' ? 'Sample development is in progress. Final colour, surface and availability will be confirmed after review.'
      : 'Visual reference for development. Sample availability and material properties have not been confirmed.';
    copy.append(node('p', 'ml-detail-scope', scope));
    if (item.trendIds.length) {
      const trends = node('p', 'ml-trend-links', 'Related research'); item.trendIds.forEach(t => trends.append(link(t, 'trend-story.html?report=' + encodeURIComponent(t)))); copy.append(trends);
    }
    layout.append(visual, copy); d.append(layout);
    const pool = pageIsBoard ? items.filter(i => board.has(i.id)) : matches;
    const index = pool.findIndex(i => i.id === id), nav = node('div', 'ml-detail-nav');
    const prev = button('← Previous', '', () => openDetail(pool[index - 1].id)); prev.disabled = index <= 0;
    const next = button('Next →', '', () => openDetail(pool[index + 1].id)); next.disabled = index < 0 || index >= pool.length - 1;
    nav.append(prev, node('span', null, index >= 0 ? (index + 1) + ' / ' + pool.length : item.id), next); d.append(nav);
    showDialog(item.title); syncColourwayControls(); d.querySelector('.ml-dialog-close').focus({preventScroll: true});
  }
  function openCompare() {
    if (!compared.size) return;
    const d = ensureDialog(); d.replaceChildren(closeButton()); const content = node('div', 'ml-compare');
    content.append(node('h2', null, 'Compare materials'), node('p', 'ml-compare-intro', 'Compare the identified visual and development details. Physical performance requires the actual material.'));
    const scroll = node('div', 'ml-compare-scroll'), table = node('table'), selected = [...compared].map(id => byId.get(id)).filter(Boolean);
    const head = node('thead'), tr = node('tr'); tr.append(node('th', null, 'Material'));
    selected.forEach(i => { const th = node('th'); th.append(image(previewFor(i), i.title, '', true), node('p', 'ml-compare-name', i.title), node('p', 'ml-compare-id', i.id)); tr.append(th); }); head.append(tr); table.append(head);
    const tbody = node('tbody');
    [['Type', i => i.type === 'fabric' ? 'Fabric' : 'Pattern'], ['Family', i => i.family], ['Structure', i => i.structure || i.technique || 'Not specified'], ['Colour', i => i.colors.join(' / ') || 'See reference'], ['Application', i => i.uses.join(' / ') || 'To be developed'], ['Source', i => SOURCE[i.sourceType]], ['Status', i => STATUS[i.status]], ['Development season', i => i.developmentSeasons.join(' / ') || 'Not assigned'], ['Source season', i => i.season]].forEach(([label, getter]) => {
      const row = node('tr'); const th = node('th', null, label); th.scope = 'row'; row.append(th); selected.forEach(i => row.append(node('td', null, getter(i)))); tbody.append(row);
    });
    const action = node('tr'); action.append(node('th', null, 'Board'));
    selected.forEach(i => { const td = node('td'); const b = button(board.has(i.id) ? 'Saved ✓' : 'Save material', 'ml-button ml-button--small', () => { if (saveItem(i)) { b.textContent = 'Saved ✓'; toast('Saved to your Material Board in this browser'); } }); td.append(b); action.append(td); }); tbody.append(action); table.append(tbody); scroll.append(table); content.append(scroll); d.append(content); showDialog('Compare materials'); d.querySelector('.ml-dialog-close').focus({preventScroll: true});
  }

  function renderBoard() {
    root.replaceChildren(heading('Material Board', 'Your saved fabrics, patterns and development notes.', 'SOHO Fashion / Your Selection'));
    if (sharedIds.length) {
      const shared = node('div', 'ml-board-shared'); shared.append(node('span', null, sharedIds.length + ' materials have been shared with you. Add them to your board to keep and annotate them.'), button('Add shared materials', 'ml-button ml-button--small', () => {
        sharedIds.forEach(id => { if (byId.has(id)) saveItem(byId.get(id), undefined, true); }); const saved = persist(); const n = sharedIds.length; sharedIds = []; history.replaceState({}, '', location.pathname); renderBoard(); if (saved) toast(n + ' shared materials added to this browser');
      })); root.append(shared);
    }
    const actions = node('div', 'ml-board-actions');
    actions.append(link('Continue browsing ↗', LIBRARY_URL, 'ml-button ml-button--dark'), button('Export selection', 'ml-button', () => exportBoard('csv')), button('Save board file', 'ml-button ml-button--quiet', () => exportBoard('json')), button('Share material list', 'ml-button ml-button--quiet', shareBoard)); root.append(actions);
    const toolbar = node('div', 'ml-board-toolbar');
    const count = node('span'); count.append(node('strong', null, board.size), document.createTextNode(board.size === 1 ? ' saved material' : ' saved materials')); toolbar.append(count);
    const label = node('label', null, 'Board group'), select = node('select'); select.id = 'ml-board-group'; select.setAttribute('aria-label', 'Filter board by group'); label.append(select); toolbar.append(label); root.append(toolbar); updateGroupOptions(); select.value = groupFilter;
    select.addEventListener('change', () => { groupFilter = select.value; renderBoardItems(); });
    const missing = [...board.keys()].filter(id => !byId.has(id));
    if (missing.length) root.append(node('p', 'ml-board-missing', missing.length + ' saved ' + (missing.length === 1 ? 'reference is' : 'references are') + ' no longer in the current library. They remain in your exported board file.'));
    const grid = node('div', 'ml-board-grid'); root.append(grid); renderBoardItems();
    root.append(node('p', 'ml-board-info', 'Your board is saved in this browser. Export a copy to keep your notes and groups. Shared links contain material IDs only; your notes and groups are not included. Saving a reference or design concept does not confirm physical sample availability.'));
    countUpdate();
  }
  function updateGroupOptions() {
    const select = root.querySelector('#ml-board-group'); if (!select) return;
    const groups = [...new Set([...board.values()].map(r => r.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (groupFilter && !groups.includes(groupFilter) && groupFilter !== '__ungrouped') groupFilter = '';
    select.replaceChildren(); const all = node('option', null, 'All groups'); all.value = ''; select.append(all);
    const ungrouped = node('option', null, 'Ungrouped'); ungrouped.value = '__ungrouped'; select.append(ungrouped);
    groups.forEach(g => { const option = node('option', null, g); option.value = g; select.append(option); }); select.value = groupFilter;
  }
  function renderBoardItems() {
    const grid = root.querySelector('.ml-board-grid'); grid.replaceChildren();
    const current = items.filter(i => board.has(i.id) && (!groupFilter || (groupFilter === '__ungrouped' ? !board.get(i.id).group : board.get(i.id).group === groupFilter)));
    if (!current.length) {
      const empty = node('div', 'ml-empty'); empty.append(node('h2', null, board.size ? 'No materials in this group.' : 'Start with a material.'), node('p', null, board.size ? 'Choose another group to view your saved materials.' : 'Save fabrics and patterns while you browse. Keep colour choices, organise groups and add your development notes here.'), link('Explore the library ↗', LIBRARY_URL, 'ml-button ml-button--dark')); grid.append(empty);
    } else grid.append(...current.map((item, index) => card(item, true, index)));
    countUpdate(); syncPicked();
  }
  function boardRows() {
    return [...board.values()].map(r => {
      const i = byId.get(r.id);
      const selected = i ? boardColourway(i, r) : null;
      return {id: r.id, title: i?.title || 'Reference no longer in library', type: i?.type || '', family: i?.family || '', colourway: r.colorway, colourwayImage: selected?.image || r.colorwayImage || '', colours: (r.colorway && !selected ? [] : selected?.colors || i?.colors || []).join(' / '), application: i?.uses.join(' / ') || '', developmentSeason: i?.developmentSeasons.join(' / ') || '', status: i ? STATUS[i.status] : '', source: i ? SOURCE[i.sourceType] : '', group: r.group, note: r.note};
    });
  }
  function download(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], {type})); const a = link('', url); a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportBoard(format) {
    if (!board.size) { toast('Save a material before exporting your board.'); return; }
    const rows = boardRows(), stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') download(JSON.stringify({title: 'SOHO Material Board', exportedAt: new Date().toISOString(), materials: rows}, null, 2), 'application/json', 'SOHO-Material-Board-' + stamp + '.json');
    else {
      const headers = ['Material ID', 'Title', 'Type', 'Family', 'Selected colourway', 'Colourway reference image', 'Colours', 'Application', 'Development season', 'Sample status', 'Library source', 'Board group', 'Development note'];
      const keys = ['id', 'title', 'type', 'family', 'colourway', 'colourwayImage', 'colours', 'application', 'developmentSeason', 'status', 'source', 'group', 'note'];
      const escape = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const formulaSafe = v => /^(?:[\s\u0000-\u001f]*[=+\-@]|[\t\r\n])/.test(String(v)) ? "'" + v : v;
      const csv = [headers.map(escape).join(','), ...rows.map(r => keys.map(k => escape(formulaSafe(r[k]))).join(','))].join('\r\n');
      download('\uFEFF' + csv, 'text/csv;charset=utf-8', 'SOHO-Material-Selection-' + stamp + '.csv');
    }
    toast('Your board has been exported');
  }
  async function shareBoard() {
    if (!board.size) { toast('Save a material before sharing a list.'); return; }
    const ids = [...board.keys()].filter(id => byId.has(id)); if (!ids.length) { toast('No current library materials to share.'); return; }
    const url = new URL(BOARD_URL, location.href); url.searchParams.set('ids', ids.join(','));
    if (url.href.length > 8000) { toast('This board is too large for one shared link. Export the selection file instead.'); return; }
    try { await navigator.clipboard.writeText(url.href); toast('Material list link copied. Your notes and groups stay private.'); }
    catch (_) {
      const d = ensureDialog(); d.replaceChildren(closeButton()); const content = node('div', 'ml-compare');
      content.append(node('h2', null, 'Share your material list'), node('p', 'ml-compare-intro', 'Copy this link. It contains material IDs only, without your notes or groups.'));
      const input = node('input'); input.type = 'text'; input.value = url.href; input.readOnly = true; input.style.cssText = 'width:100%;padding:13px;border:1px solid #deded7;font:inherit;font-size:12px'; input.setAttribute('aria-label', 'Material list share link'); content.append(input); d.append(content); showDialog('Share material list'); input.focus(); input.select();
    }
  }

  function wireSharedHeader() {
    if (sharedHeaderWired) return; sharedHeaderWired = true;
    const search = document.querySelector('.header-search');
    if (search) search.addEventListener('submit', e => {
      e.preventDefault(); const query = search.querySelector('input')?.value.trim() || '';
      if (pageIsBoard || !root) location.href = LIBRARY_URL + '?q=' + encodeURIComponent(query);
      else { state.q = query; updateLibrary(); root.querySelector('#ml-search').focus(); }
    });
    const selection = document.querySelector('[aria-label="View selection"]'); if (selection) selection.addEventListener('click', () => { location.href = 'my-selection.html'; });
    const contact = document.querySelector('[aria-label="Subscribe"], [aria-label="Contact SOHO Fashion"]'); if (contact) { contact.setAttribute('aria-label', 'Contact SOHO Fashion'); contact.addEventListener('click', () => { location.href = 'mailto:online@saintycorp.com'; }); }
  }
  async function load() {
    if (loading) return; loading = true;
    try {
      const response = await fetch(DATA_URL); if (!response.ok) throw new Error('Library response ' + response.status);
      const data = await response.json(), raw = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(raw)) throw new Error('No library items');
      const seen = new Set(); items = raw.map(normalise).filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }); byId = new Map(items.map(i => [i.id, i])); libraryCards.clear();
      if (pageIsBoard) { const params = new URLSearchParams(location.search); sharedIds = [...new Set((params.get('ids') || '').split(','))].filter(id => byId.has(id)); renderBoard(); }
      else { await resolveTrendSelection(); renderLibrary(); }
      wireSharedHeader();
      if (!lifecycleWired) {
        lifecycleWired = true;
        window.addEventListener('popstate', async () => { if (!pageIsBoard) { const previous = state.page; state = readState(); const pending = resolveTrendSelection(); updateLibrary(true, true); await pending; updateLibrary(true, true); if (state.page !== previous) requestAnimationFrame(scrollResults); } });
        window.addEventListener('storage', e => { if (e.key === BOARD_KEY) { board = readBoard(); if (pageIsBoard) renderBoard(); else countUpdate(); } });
        document.addEventListener('click', e => { if (!e.target.closest('.ml-filter')) root.querySelectorAll('.ml-filter[open]').forEach(d => { d.open = false; }); });
      }
    } catch (error) {
      root.replaceChildren(heading(pageIsBoard ? 'Material Board' : 'Materials & Patterns', 'Explore cloth, colour and pattern.'));
      const empty = node('div', 'ml-empty'); empty.append(node('h2', null, 'The library is temporarily unavailable.'), node('p', null, 'Your saved selection has not been changed. Please try loading the library again.'), button('Try again', 'ml-button', load)); root.append(empty);
    } finally { loading = false; }
  }
  load();
})();
