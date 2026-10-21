(() => {
  'use strict';

  const DATA = [
    { slug: 'shacket', no: '01', name: 'SHACKET', title: 'FW26 Shacket Trend', note: 'CountryCraft · BuffaloCheck · OliveGreen · UtilityShift' },
    { slug: 'shirt',   no: '02', name: 'SHIRT',   title: 'FW26 Shirt Trend',   note: 'Heavyweight Shirt · Yarn-dyed Check · Gender-inclusive · Intellectual Aesthetic' },
    { slug: 'jacket',  no: '03', name: 'JACKET',  title: 'FW26 Jacket Trend',  note: 'Quilted Jacket · Elevated Quilting · Irregular Stitching · Fur Collar' },
    { slug: 'coat',    no: '04', name: 'COAT',    title: 'FW26 Coat Trend',    note: 'Hip-length Coat · Herringbone · Houndstooth · Investment-level' },
    { slug: 'trouser', no: '05', name: 'TROUSER', title: 'FW26 Trouser Trend', note: 'Urban Sophistication · Relaxed Formal · Heather Grey · Textured Knit Dyeing' },
    { slug: 'fabric',  no: '06', name: 'FABRIC',  title: 'FW26 Fabric Trend',  note: 'Knit Faux Tweed · Muted Navy Blue · Herringbone Woven · Knit Melange' }
  ];

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const params = new URLSearchParams(location.search);
  let index = DATA.findIndex(item => item.slug === (params.get('t') || 'shacket'));
  if (index < 0) index = 0;
  const item = DATA[index];
  const prev = DATA[(index - 1 + DATA.length) % DATA.length];
  const next = DATA[(index + 1) % DATA.length];

  document.title = `${item.name} · SOHO-Marks`;

  const root = document.getElementById('trend-detail');

  const crumb = el('div', 'breadcrumb');
  const back = el('a', null, 'TREND');
  back.href = 'trend.html';
  crumb.append(back, document.createTextNode(` / ${item.name}`));
  root.append(crumb);

  const head = el('div', 'trend-detail-head');
  head.append(el('p', 'eyebrow', `FW26 TREND · ${item.no}`));
  head.append(el('h1', null, item.title));
  head.append(el('p', 'trend-detail-note', item.note));
  const countLabel = el('p', 'trend-detail-count', '正在读取趋势文件…');
  head.append(countLabel);
  root.append(head);

  const pages = el('div', 'trend-pages');
  root.append(pages);

  const nav = el('nav', 'trend-detail-nav');
  const prevLink = el('a', null, `← ${prev.name}`);
  prevLink.href = `trend-detail.html?t=${prev.slug}`;
  const backLink = el('a', null, '返回 TREND');
  backLink.href = 'trend.html';
  const nextLink = el('a', null, `${next.name} →`);
  nextLink.href = `trend-detail.html?t=${next.slug}`;
  nav.append(prevLink, backLink, nextLink);
  root.append(nav);

  fetch('assets/pdf-pages/manifest.json')
    .then(response => response.json())
    .then(manifest => {
      const total = manifest[item.slug] || 0;
      pages.innerHTML = '';
      if (!total) {
        countLabel.textContent = '这份趋势文件还没有上传';
        pages.append(el('p', 'empty-note', 'PDF 页面还没有生成，请联系管理员。'));
        return;
      }
      countLabel.textContent = `共 ${total} 页 · 可上下滚动查看`;
      for (let i = 1; i <= total; i++) {
        const figure = el('figure', 'trend-page');
        const img = document.createElement('img');
        img.src = `assets/pdf-pages/${item.slug}/p${String(i).padStart(2, '0')}.webp`;
        img.alt = `${item.title} 第 ${i} 页`;
        img.loading = i <= 1 ? 'eager' : 'lazy';
        img.decoding = 'async';
        figure.append(img);
        pages.append(figure);
      }
    })
    .catch(() => {
      countLabel.textContent = '趋势文件加载失败';
    });
})();
