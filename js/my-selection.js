(function () {
  'use strict';

  const DATA_URL = 'data/collections.json';
  const SELECTION_KEY = 'soho-collection-selection';
  const MATERIALS_KEY = 'soho-material-choices';
  const SUBMISSIONS_KEY = 'soho-selection-submissions';
  const SUBMITTED_KEY = 'soho-selection-submitted';

  let data = null;
  let products = [];

  const read = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  let toastTimer = null;
  function toast(message) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
  }

  const selectionCodes = () => read(SELECTION_KEY, []) || [];
  const materialMap = () => read(MATERIALS_KEY, {}) || {};

  function setCodes(codes) {
    write(SELECTION_KEY, codes);
    updateCount();
  }

  function updateCount() {
    const count = document.getElementById('count');
    if (!count) return;
    const total = selectionCodes().length;
    count.textContent = total;
    count.hidden = total === 0;
  }

  function storeLabel() {
    const identity = read('soho-demo-identity', {}) || {};
    return identity.store || identity.storeName || identity.name || 'Store Toronto';
  }

  function selectedItems() {
    const codes = selectionCodes();
    return products.filter(product => codes.includes(product.code));
  }

  function itemRows(items) {
    const mats = materialMap();
    return items.map(product => ({
      code: product.code,
      name: product.name,
      gender: product.gender || '',
      type: product.type || '',
      colour: (product.colours && product.colours[0]) ? product.colours[0].name : '',
      material: mats[product.code] || 'To be confirmed',
      baseMaterial: product.material || '',
      fit: product.fit || '',
      weight: product.weight || '',
      retail: product.retail || 'To be confirmed',
      description: product.description || '',
      occasions: (product.occasions || []).join(' / '),
      image: product.image
    }));
  }

  const ZH = {
    gender: { women: '女装', men: '男装' },
    type: { outerwear: '外套', top: '上装', bottom: '下装', shirt: '衬衫' },
    colour: { Olive: '橄榄绿', Sand: '沙色', Charcoal: '炭灰', Black: '黑色', Navy: '海军蓝', Indigo: '靛蓝', Brown: '棕色', Grey: '灰色', Cream: '奶油色', Oat: '燕麦色', White: '白色', Camel: '驼色', 'Light wash': '浅洗', 'Light blue': '浅蓝', 'Red plaid': '红格', 'Navy plaid': '海军蓝格', Coffee: '咖啡色' },
    material: { 'Cotton twill': '棉斜纹', 'Cotton blend': '棉混纺', 'Textured weave': '肌理织', Corduroy: '灯芯绒', Denim: '牛仔', 'Stretch denim': '弹力牛仔', 'Wool blend': '羊毛混纺', 'Faux wool': '仿羊毛', 'Quilted nylon': '绗缝尼龙', 'Cable knit': '麻花针织', 'Brushed flannel': '磨毛法兰绒', 'Cotton flannel': '棉法兰绒', 'Fleece knit': '摇粒绒', 'Sherpa fleece': '羊羔绒', 'Cotton knit': '棉针织', Linen: '亚麻', 'Stretch twill': '弹力斜纹', Ponte: '罗马布', 'Performance knit': '功能针织', 'Rigid denim': '硬挺牛仔', 'Fleece-lined knit': '加绒针织' },
    fit: { 'Relaxed fit': '宽松版', 'Regular fit': '常规版', 'Straight leg': '直筒', 'High rise': '高腰', 'High rise wide leg': '高腰阔腿', Longline: '长款', 'Oversized fit': '廓形', 'Relaxed straight': '宽松直筒' },
    weight: { 'Layering weight': '叠穿厚薄', 'Mid weight': '中厚', 'Heavy weight': '高厚', 'Light weight': '轻薄' }
  };
  const zh = (group, value) => (ZH[group] && ZH[group][value]) || '';
  const bi = (group, value) => {
    if (!value) return '—';
    const cn = zh(group, value);
    return cn ? `${value} / ${cn}` : value;
  };

  function exportCsv(items) {
    const rows = itemRows(items);
    const header = ['款号 Style No.', '款式名称 Style Name', '品类 Category', '性别 Gender', '颜色 Colour',
      '面料 Fabric', '选中材料 Selected Material', '版型 Fit', '克重 Weight', '目标零售价 Target Retail',
      '工艺说明 Workmanship', '图片 Image'];
    const lines = [header].concat(rows.map(row => [
      row.code,
      row.name,
      bi('type', row.type),
      bi('gender', row.gender),
      bi('colour', row.colour),
      bi('material', row.baseMaterial),
      bi('material', row.material),
      bi('fit', row.fit),
      bi('weight', row.weight),
      row.retail,
      row.description || '',
      row.image
    ]));
    const csv = '\ufeff' + lines.map(line => line
      .map(cell => `"${String(cell == null ? '' : cell).replace(/"/g, '""')}"`)
      .join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.href = URL.createObjectURL(blob);
    link.download = `marks-selection-${stamp}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast(`Exported ${items.length} style${items.length > 1 ? 's' : ''} to CSV`);
  }

  function techPackHtml(items) {
    const mats = materialMap();
    const date = new Date().toLocaleDateString();
    const row = (cn, en, value) => `<tr><th>${cn}<span>${en}</span></th><td>${value == null || value === '' ? '—' : value}</td></tr>`;
    const sections = items.map((product, index) => {
      const views = (product.views && product.views.length ? product.views : [product.image])
        .map(src => new URL(src, location.href).href);
      const main = views[0];
      const thumbs = views.slice(1, 4);
      const colour = (product.colours && product.colours[0]) || null;
      return `<section class="pack">
        <header>
          <div class="brand">SOHO FASHION × MARKS</div>
          <div class="doc">工艺单 / TECH PACK</div>
          <div class="meta">AW26 · ${storeLabel()} · ${date} · ${index + 1} / ${items.length}</div>
        </header>
        <div class="body">
          <div class="images">
            <img class="main" src="${main}" alt="${product.name}">
            ${thumbs.map(src => `<img class="thumb" src="${src}" alt="${product.name} view">`).join('')}
          </div>
          <table>
            ${row('款号', 'Style No.', product.code)}
            ${row('款式名称', 'Style Name', product.name)}
            ${row('品类', 'Category', bi('type', product.type))}
            ${row('性别', 'Gender', bi('gender', product.gender))}
            ${row('版型', 'Fit', bi('fit', product.fit))}
            ${row('面料', 'Fabric', bi('material', product.material))}
            ${row('选中材料', 'Selected Material', mats[product.code] ? bi('material', mats[product.code]) : '待确认 / TBC')}
            ${row('颜色', 'Colour', colour ? bi('colour', colour.name) : '—')}
            ${row('克重', 'Weight', bi('weight', product.weight))}
            ${row('目标零售价', 'Target Retail', product.retail === 'To be confirmed' ? 'To be confirmed / 待确认' : (product.retail || '待确认 / TBC'))}
            ${row('季节', 'Season', 'AW26 秋冬')}
          </table>
        </div>
        <div class="notes">
          <h3>工艺说明 / Workmanship</h3>
          <p>${product.description || ''}</p>
          <h3>备注 / Remarks</h3>
          <div class="lines"></div>
        </div>
        <footer><span>SOHO FASHION · 工艺单 TECH PACK</span><span>${product.code} · ${index + 1}/${items.length}</span></footer>
      </section>`;
    }).join('');

    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>工艺单 Tech Pack</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; font-family: Helvetica, Arial, "Microsoft YaHei", sans-serif; }
        .pack { page-break-after: always; padding: 2mm 0 4mm; }
        header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111; padding-bottom: 6px; }
        .brand { font-size: 12px; font-weight: 700; letter-spacing: .08em; }
        .doc { font-size: 20px; font-weight: 700; }
        .meta { font-size: 10px; color: #444; }
        .body { display: grid; grid-template-columns: 72mm minmax(0, 1fr); gap: 8mm; margin-top: 6mm; }
        .images { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; align-content: start; }
        .images .main { grid-column: 1 / -1; width: 100%; height: 112mm; object-fit: contain; background: #f5f4f0; }
        .images .thumb { width: 100%; height: 38mm; object-fit: cover; background: #f5f4f0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { width: 32%; text-align: left; font-weight: 600; background: #f5f4f0; border: 1px solid #ccc; padding: 6px 7px; vertical-align: top; }
        th span { display: block; font-weight: 400; font-size: 9px; color: #555; margin-top: 1px; }
        td { border: 1px solid #ccc; padding: 6px 7px; line-height: 1.45; }
        .notes { margin-top: 6mm; }
        .notes h3 { font-size: 11px; margin: 4mm 0 1.5mm; letter-spacing: .06em; text-transform: uppercase; }
        .notes p { font-size: 11px; line-height: 1.6; margin: 0; }
        .lines { height: 24mm; border-bottom: 1px solid #bbb; background: repeating-linear-gradient(transparent, transparent 7mm, #eee 7mm, #eee 7.2mm); }
        footer { display: flex; justify-content: space-between; margin-top: 4mm; border-top: 1px solid #111; padding-top: 4px; font-size: 9px; color: #555; }
      </style></head><body>${sections}
      <script>window.addEventListener('load', () => setTimeout(() => window.print(), 500));<\/script>
      </body></html>`;
  }

  function exportTechPack(items) {
    const win = window.open('', '_blank');
    if (!win) {
      toast('Allow pop-ups to export the tech pack');
      return;
    }
    win.document.open();
    win.document.write(techPackHtml(items));
    win.document.close();
    toast(`Tech pack ready — ${items.length} style${items.length > 1 ? 's' : ''}`);
  }

  function submitSelection(items) {
    const record = { items: itemRows(items), at: new Date().toISOString() };
    const list = read(SUBMISSIONS_KEY, []) || [];
    list.push(record);
    write(SUBMISSIONS_KEY, list);
    write(SUBMITTED_KEY, record);
    toast(`Selection submitted — ${items.length} style${items.length > 1 ? 's' : ''}`);
    render();
  }

  function render() {
    const root = document.getElementById('selection-view');
    root.innerHTML = '';
    const items = selectedItems();

    const head = el('div', 'selection-head');
    head.append(el('p', 'col-breadcrumb', 'COLLECTION / MY SELECTION'));
    head.append(el('h1', null, 'My Selection'));
    head.append(el('p', 'selection-sub', `${data.collection.title} / ${storeLabel()}`));
    head.append(el('p', 'selection-sample', 'Sample data.'));
    root.append(head);

    const submitted = read(SUBMITTED_KEY, null);
    if (submitted) {
      const receipt = el('div', 'sel-receipt');
      receipt.append(el('strong', null, 'Selection submitted'));
      const when = new Date(submitted.at);
      receipt.append(el('span', null, `${when.toLocaleString()} · ${submitted.items.length} style${submitted.items.length > 1 ? 's' : ''}`));
      root.append(receipt);
    }

    if (!items.length) {
      const empty = el('div', 'sel-empty');
      empty.append(el('p', null, 'Nothing selected yet.'));
      const browse = el('a', 'text-link', 'Browse the collection →');
      browse.href = 'collection-series.html?occasion=everyday';
      empty.append(browse);
      root.append(empty);
      return;
    }

    const body = el('div', 'selection-body');
    const main = el('div', 'selection-main');
    const list = el('div', 'sel-list');
    const mats = materialMap();

    items.forEach(product => {
      const item = el('article', 'sel-item');
      const detailHref = `collection-detail.html?code=${encodeURIComponent(product.code)}`;

      const imageLink = el('a', 'sel-image-link');
      imageLink.href = detailHref;
      imageLink.setAttribute('aria-label', `View ${product.name} details`);
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.name;
      imageLink.append(image);
      item.append(imageLink);

      const info = el('div', 'sel-info');
      const nameLink = el('a', 'sel-name-link');
      nameLink.href = detailHref;
      nameLink.append(el('h3', 'sel-name', product.name));
      info.append(el('p', 'sel-code', product.code), nameLink);

      const colour = (product.colours && product.colours[0]) || null;
      const colourRow = el('p', 'sel-colour');
      if (colour) {
        const dot = el('span', 'sel-dot');
        dot.style.background = colour.hex;
        colourRow.append(dot, document.createTextNode(colour.name));
      }
      info.append(colourRow);

      const material = el('p', 'sel-material');
      material.append(document.createTextNode('Material: '));
      material.append(el('strong', null, mats[product.code] || 'To be confirmed'));
      info.append(material);

      const detailLink = el('a', 'sel-detail-link', 'View details →');
      detailLink.href = detailHref;
      info.append(detailLink);
      item.append(info);

      const remove = el('button', 'sel-remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${product.name}`);
      remove.addEventListener('click', () => {
        setCodes(selectionCodes().filter(code => code !== product.code));
        toast(`${product.code} removed`);
        render();
      });
      item.append(remove);
      list.append(item);
    });

    main.append(list);

    const aside = el('aside', 'sel-aside');
    aside.append(el('p', 'sel-count-label', 'Selected styles'), el('p', 'sel-count', String(items.length)));
    const techPackButton = el('button', 'btn-accent', 'Export tech pack (PDF)');
    techPackButton.type = 'button';
    techPackButton.addEventListener('click', () => exportTechPack(items));
    const exportButton = el('button', 'btn-outline', 'Export CSV');
    exportButton.type = 'button';
    exportButton.addEventListener('click', () => exportCsv(items));
    const submit = el('button', 'btn-outline', 'Submit selection');
    submit.type = 'button';
    submit.addEventListener('click', () => submitSelection(items));
    const clear = el('button', 'sel-clear', 'Clear selection');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      setCodes([]);
      toast('Selection cleared');
      render();
    });
    aside.append(techPackButton, exportButton, submit, clear);
    aside.append(el('p', 'sel-note', 'TECH PACK prints one A4 page per style, bilingual. CSV is for your buying sheet. Feedback is collected on each style page.'));

    body.append(main, aside);
    root.append(body);
  }

  fetch(DATA_URL + '?v=' + Date.now())
    .then(response => response.json())
    .then(payload => {
      data = payload;
      products = payload.products || [];
      render();
      updateCount();
    })
    .catch(() => {
      const root = document.getElementById('selection-view');
      if (root) root.innerHTML = '<p class="sel-empty">Selection could not be loaded.</p>';
    });
})();
