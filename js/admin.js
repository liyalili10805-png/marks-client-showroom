(() => {
  'use strict';

  const IMAGES = {
    'AE-14': 'assets/img/womens-look-green.webp',
    'AE-15': 'assets/img/womens-views-cream.webp',
    'AE-16': 'assets/img/womens-look-tan.webp',
    'AE-17': 'assets/img/mens-look-coat.webp',
    'AE-18': 'assets/img/mens-look-jacket.webp',
    'AE-19': 'assets/img/mens-look-quilted.webp'
  };
  const MAX_BYTES = 8 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

  let state;
  const statusEl = document.getElementById('admin-status');
  const msgEl = document.getElementById('admin-msg');

  function message(text) { msgEl.textContent = text; }

  function overrides() {
    state.overrides = state.overrides || { hero: {}, productImages: {} };
    state.overrides.hero = state.overrides.hero || {};
    state.overrides.productImages = state.overrides.productImages || {};
    return state.overrides;
  }

  async function objectUrl(id) {
    if (!id) return null;
    const blob = await DemoStore.getBlob(id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  function renderStatus() {
    const status = state.contentStatus || 'published';
    statusEl.textContent = `${status === 'published' ? 'Published' : 'Draft'} · revision ${state.siteContent.revision || 1} · demo data`;
  }

  async function fillHero() {
    const hero = state.siteContent.hero;
    document.getElementById('hero-title').value = (hero.titleLines || []).join('\n');
    document.getElementById('hero-intro').value = hero.intro || '';
    document.getElementById('hero-cta').value = hero.ctaLabel || 'Explore the collection';
    const preview = document.getElementById('hero-preview');
    const custom = await objectUrl(overrides().hero.imageId);
    preview.src = custom || 'assets/img/womens-look-green.webp';
  }

  function collectHero() {
    const lines = document.getElementById('hero-title').value.split('\n').map(line => line.trim()).filter(Boolean);
    const hero = overrides().hero;
    hero.titleLines = lines.length ? lines : state.siteContent.hero.titleLines;
    hero.intro = document.getElementById('hero-intro').value.trim();
    hero.ctaLabel = document.getElementById('hero-cta').value.trim();
    state.siteContent.hero.titleLines = hero.titleLines;
    state.siteContent.hero.intro = hero.intro;
    state.siteContent.hero.ctaLabel = hero.ctaLabel;
  }

  async function readImage(file) {
    if (!ALLOWED.includes(file.type)) throw new Error('Unsupported file type. Use JPG, PNG or WebP.');
    if (file.size > MAX_BYTES) throw new Error('File is larger than 8 MB.');
    return file;
  }

  function productCard(product) {
    const card = document.createElement('div');
    card.className = 'admin-product';
    const img = document.createElement('img');
    img.alt = product.name;
    img.src = IMAGES[product.code] || 'assets/img/womens-look-green.webp';
    const title = document.createElement('strong');
    title.textContent = product.name;
    const code = document.createElement('small');
    code.textContent = product.code;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.style.marginTop = '8px';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        await readImage(file);
        const id = 'product-' + product.code + '-' + Date.now();
        await DemoStore.putBlob(id, file);
        overrides().productImages[product.code] = id;
        await DemoStore.save(state);
        const url = await objectUrl(id);
        if (url) img.src = url;
        message(`Replaced image for ${product.code}. Save draft or publish.`);
      } catch (error) {
        message(error.message);
      }
    });
    card.append(img, title, code, input);
    return card;
  }

  async function fillProducts() {
    const box = document.getElementById('admin-products');
    box.innerHTML = '';
    (state.products || []).forEach(product => {
      box.append(productCard(product));
      objectUrl(overrides().productImages[product.code]).then(url => {
        if (url) {
          const img = box.lastElementChild.querySelector('img');
          img.src = url;
        }
      });
    });
  }

  document.getElementById('hero-image').addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      await readImage(file);
      const id = 'hero-' + Date.now();
      await DemoStore.putBlob(id, file);
      overrides().hero.imageId = id;
      await DemoStore.save(state);
      const url = await objectUrl(id);
      if (url) document.getElementById('hero-preview').src = url;
      message('Hero image stored. Save draft or publish.');
    } catch (error) {
      message(error.message);
    }
  });

  document.getElementById('save-draft').addEventListener('click', async () => {
    collectHero();
    state.contentStatus = 'draft';
    await DemoStore.save(state);
    renderStatus();
    message('Draft saved. The storefront still shows the published version.');
  });

  document.getElementById('publish').addEventListener('click', async () => {
    collectHero();
    state.overridesHistory = state.overridesHistory || [];
    state.overridesHistory.push(JSON.parse(JSON.stringify(overrides())));
    state.contentStatus = 'published';
    state.siteContent.revision = (state.siteContent.revision || 1) + 1;
    await DemoStore.save(state);
    renderStatus();
    message('Published. Open Preview or Collection to see the new version.');
  });

  document.getElementById('withdraw').addEventListener('click', async () => {
    state.contentStatus = 'draft';
    await DemoStore.save(state);
    renderStatus();
    message('Withdrawn. The storefront will show the previous published version.');
  });

  document.getElementById('restore').addEventListener('click', async () => {
    const history = state.overridesHistory || [];
    if (!history.length) { message('No previous version to restore.'); return; }
    state.overrides = history.pop();
    state.siteContent.revision = (state.siteContent.revision || 1) + 1;
    await DemoStore.save(state);
    await fillHero();
    await fillProducts();
    renderStatus();
    message('Restored the previous content version.');
  });

  DemoStore.state().then(payload => {
    state = payload;
    renderStatus();
    fillHero();
    fillProducts();
  });
})();
