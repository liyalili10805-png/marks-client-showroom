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

  async function exportExcel(items) {
    if (!window.ExcelJS) {
      toast('Excel library is still loading, try again');
      return;
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SOHO FASHION';
    wb.created = new Date();

    const thin = { style: 'thin', color: { argb: 'FF999999' } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    const blackFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
    const sectionFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EEF0' } };
    const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFE7EA' } };
    const labelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4F0' } };
    const mats = materialMap();
    const date = new Date().toLocaleDateString();
    const season = 'Apparel Fall-Winter 2027 / 秋冬 2027';
    const viewsOf = product => (product.views && product.views.length ? product.views : [product.image])
      .map(src => new URL(src, location.href).href);
    const toPng = async src => {
      try {
        const img = new Image();
        img.src = src;
        await Promise.race([
          img.decode(),
          new Promise((resolve, reject) => setTimeout(() => reject(new Error('image timeout')), 4000))
        ]);
        const maxWidth = 700;
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.82);
      } catch (error) {
        return null;
      }
    };
    const imageCache = {};
    for (const product of items) {
      imageCache[product.code] = (await Promise.all(viewsOf(product).slice(0, 4).map(toPng))).filter(Boolean);
    }
    const bomHead = ['Placement / 部位', 'Supplier / 供应商', 'Supplier Ref. / 供应商料号', 'Material Ref. / 材料编号',
      'Material Description / 材料描述', 'Status / 状态', 'Color / 颜色', 'UOM / 单位', 'Consumption / 用量', 'Price / 单价', 'Comments / 备注'];

    items.forEach(product => {
      const ws = wb.addWorksheet(product.code.slice(0, 31));
      ws.columns = [{ width: 18 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 26 }, { width: 14 },
        { width: 12 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 20 }];
      ws.views = [{ state: 'frozen', ySplit: 2 }];
      ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

      const put = (row, col, value, opts) => {
        const cell = ws.getCell(row, col);
        cell.value = value;
        const options = opts || {};
        if (options.bold || options.color || options.size) {
          cell.font = { bold: !!options.bold, color: options.color ? { argb: options.color } : undefined, size: options.size || 10 };
        }
        if (options.fill) cell.fill = options.fill;
        if (options.align) cell.alignment = options.align;
        if (options.wrap) cell.alignment = Object.assign({}, cell.alignment, { wrapText: true, vertical: 'top' });
        if (options.border !== false) cell.border = border;
        return cell;
      };
      const merge = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2);
      const headerRow = row => {
        bomHead.forEach((text, index) => put(row, index + 1, text, { bold: true, fill: headFill, wrap: true, size: 8 }));
        ws.getRow(row).height = 34;
      };
      const bomRow = (row, values) => {
        values.forEach((value, index) => put(row, index + 1, value, { wrap: true, size: 9 }));
        ws.getRow(row).height = 30;
      };

      merge(1, 1, 1, 11);
      put(1, 1, 'SOHO FASHION × MARKS · 工艺单 / TECH PACK', { bold: true, color: 'FFFFFFFF', fill: blackFill, align: { horizontal: 'center', vertical: 'middle' }, size: 14 });
      ws.getRow(1).height = 28;

      merge(2, 1, 2, 11);
      put(2, 1, `${product.name} / ${product.code}`, { bold: true, size: 12, fill: labelFill });
      ws.getRow(2).height = 22;

      const field = (row, labelA, valueA, labelB, valueB) => {
        put(row, 1, labelA, { bold: true, fill: labelFill, size: 9 });
        merge(row, 2, row, 3);
        put(row, 2, valueA, { size: 9 });
        put(row, 4, labelB, { bold: true, fill: labelFill, size: 9 });
        merge(row, 5, row, 11);
        put(row, 5, valueB, { size: 9 });
        ws.getRow(row).height = 20;
      };

      field(3, 'Brand / 品牌', 'SOHO FASHION', 'Banner / 渠道', "Mark's");
      field(4, 'Product Description / 产品描述', product.name, 'Season / 季节', season);
      field(5, 'Design # / 设计编号', product.code, 'Product # / 产品编号', product.code);
      field(6, 'Category (L3)', bi('gender', product.gender), 'Sub-Category (L4)', bi('type', product.type));
      field(7, 'Product Designer', 'To be confirmed', 'TD Specialist', 'To be confirmed');

      let row = 9;
      merge(row, 1, row, 11);
      put(row, 1, 'Section: Fabrics / 面料', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      headerRow(row);
      const colour = (product.colours && product.colours[0]) ? product.colours[0].name : '';
      const selected = mats[product.code] ? bi('material', mats[product.code]) : '待确认 / TBC';
      row += 1;
      bomRow(row, ['Fabric A : Shell fabric / 主面料', 'To be confirmed', '—', '—', `${bi('material', product.material)} · Composition TBC`, 'In Development', colour, 'm', '0.00', '$0.000', 'Body fabric']);
      row += 1;
      bomRow(row, ['Fabric B : Selected material / 选中材料', 'To be confirmed', '—', '—', `${selected} · Composition TBC`, 'In Development', colour, 'm', '0.00', '$0.000', 'Selected by store']);

      row += 2;
      merge(row, 1, row, 11);
      put(row, 1, 'Section: Trims, Labels & Packaging / 辅料、标签与包装', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      headerRow(row);
      row += 1;
      [
        ['Main label / 主标', 'To be confirmed', '—', '—', 'Brand label', 'In Development', '—', 'each', '1.00', '$0.000', '—'],
        ['Care label / 洗标', 'To be confirmed', '—', '—', 'Care & content label', 'In Development', '—', 'each', '1.00', '$0.000', '—'],
        ['Main hangtag / 吊牌', 'To be confirmed', '—', '—', 'Hangtag', 'In Development', '—', 'each', '1.00', '$0.000', '—'],
        ['Polybag / 胶袋', 'Factory source', '—', '—', 'Recycled polybag', 'In Development', 'Clear', 'each', '1.00', '$0.000', '—']
      ].forEach(values => {
        bomRow(row, values);
        row += 1;
      });

      row += 1;
      merge(row, 1, row, 11);
      put(row, 1, 'Measurement Spec / 尺寸表（cm）', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      ['Point of Measure / 部位', 'S', 'M', 'L', 'XL', 'Tolerance / 公差'].forEach((text, index) => {
        put(row, index + 1, text, { bold: true, fill: headFill, align: { horizontal: 'center' }, size: 9 });
      });
      merge(row, 6, row, 11);
      row += 1;
      ['Chest / 胸围', 'Shoulder / 肩宽', 'Length / 衣长', 'Sleeve / 袖长', 'Waist / 腰围'].forEach(label => {
        put(row, 1, label, { size: 9, fill: labelFill });
        ['', '', '', ''].forEach((value, index) => put(row, index + 2, value, { size: 9, align: { horizontal: 'center' } }));
        merge(row, 6, row, 11);
        put(row, 6, '±1.0', { size: 9, align: { horizontal: 'center' } });
        row += 1;
      });

      row += 2;
      merge(row, 1, row, 11);
      put(row, 1, 'Construction Details / 工艺细节', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      ['Part / 部位', 'Construction / 工艺说明', 'Stitch / 线迹', 'Notes / 备注'].forEach((text, index) => {
        put(row, index + 1, text, { bold: true, fill: headFill, size: 9 });
      });
      merge(row, 4, row, 11);
      row += 1;
      ['CF placket / 门襟', 'Collar / 领口', 'Pocket / 口袋', 'Cuff / 袖口', 'Hem / 下摆', 'Shoulder / 肩部'].forEach(part => {
        put(row, 1, part, { size: 9, fill: labelFill });
        put(row, 2, '', { size: 9 });
        put(row, 3, '', { size: 9 });
        merge(row, 4, row, 11);
        put(row, 4, '', { size: 9 });
        row += 1;
      });

      row += 1;
      merge(row, 1, row, 11);
      put(row, 1, 'Stitch Legend / 线迹说明', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      put(row, 1, 'Code / 编号', { bold: true, fill: headFill, size: 9 });
      merge(row, 2, row, 11);
      put(row, 2, 'Description / 说明', { bold: true, fill: headFill, size: 9 });
      row += 1;
      ['SNLS / 单针平车', 'LTS 1/8" / 1/8" 明线', 'LTS 1/4" / 1/4" 明线', 'LES / 锁边线', 'CHS / 链条线', 'BT / 打枣', '2NCS 1/4" / 双针绷缝'].forEach(item => {
        put(row, 1, item, { size: 9, fill: labelFill });
        merge(row, 2, row, 11);
        put(row, 2, '', { size: 9 });
        row += 1;
      });

      row += 1;
      merge(row, 1, row, 11);
      put(row, 1, 'Fit Comments / 版型意见', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      ['Date / 日期', 'Round / 轮次', 'Comment / 意见', 'Status / 状态'].forEach((text, index) => {
        put(row, index + 1, text, { bold: true, fill: headFill, size: 9 });
      });
      merge(row, 4, row, 11);
      row += 1;
      for (let i = 0; i < 3; i += 1) {
        put(row, 1, '', { size: 9 });
        put(row, 2, '', { size: 9 });
        put(row, 3, '', { size: 9 });
        merge(row, 4, row, 11);
        put(row, 4, '', { size: 9 });
        row += 1;
      }

      row += 2;
      merge(row, 1, row, 11);
      put(row, 1, 'Product Images / 产品图', { bold: true, fill: sectionFill, size: 10 });
      row += 1;
      const dataUrls = imageCache[product.code] || [];
      const imageIds = dataUrls.map(data => wb.addImage({ base64: data, extension: 'jpeg' }));
      imageIds.forEach((id, index) => ws.addImage(id, { tl: { col: index * 3, row: row - 1 }, ext: { width: 200, height: 250 } }));
      ws.getRow(row).height = 190;
      row += 1;
      ['Front / 正面', 'Side / 侧面', 'Back / 背面', 'Detail / 细节'].forEach((label, index) => {
        put(row, index * 3 + 1, label, { bold: true, size: 8, align: { horizontal: 'center' } });
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.href = URL.createObjectURL(blob);
    link.download = `marks-techpack-${stamp}.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    toast(`Excel tech pack exported — ${items.length} style${items.length > 1 ? 's' : ''}`);
  }

  function techPackHtml(items) {
    const date = new Date().toLocaleDateString();
    const season = 'AW26 / 秋冬 26';
    const esc = value => String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const viewsOf = product => (product.views && product.views.length ? product.views : [product.image])
      .map(src => new URL(src, location.href).href);
    const mats = materialMap();

    const section = (product, index) => {
      const images = viewsOf(product);
      const colour = (product.colours && product.colours[0]) ? product.colours[0].name : '';
      const selected = mats[product.code] ? bi('material', mats[product.code]) : '待确认 / TBC';
      const row = (label, value) => `<tr><th>${label}</th><td>${value == null || value === '' ? '—' : value}</td></tr>`;
      return `<section class="pack">
        <header class="head">
          <div class="brand">SOHO FASHION × MARKS</div>
          <div class="doc">工艺单 / TECH PACK</div>
          <div class="meta">${season} · ${storeLabel()} · ${date} · ${index + 1} / ${items.length}</div>
        </header>
        <div class="fields">
          <div><span>Product Description / 产品描述</span><b>${esc(product.name)}</b></div>
          <div><span>Style No. / 款号</span><b>${esc(product.code)}</b></div>
          <div><span>Season / 季节</span><b>${season}</b></div>
          <div><span>Category / 品类</span><b>${bi('type', product.type)}</b></div>
        </div>
        <div class="layout">
          <div class="images">
            ${images.slice(0, 4).map((src, i) => `<img class="${i === 0 ? 'main' : 'thumb'}" src="${src}" alt="${esc(product.name)}">`).join('')}
          </div>
          <table class="info">
            ${row('Style No. / 款号', product.code)}
            ${row('Style Name / 款式名称', product.name)}
            ${row('Category / 品类', bi('type', product.type))}
            ${row('Gender / 性别', bi('gender', product.gender))}
            ${row('Fit / 版型', bi('fit', product.fit))}
            ${row('Fabric / 面料', bi('material', product.material))}
            ${row('Selected Material / 选中材料', selected)}
            ${row('Colour / 颜色', colour ? bi('colour', colour) : '—')}
            ${row('Weight / 克重', bi('weight', product.weight))}
            ${row('Target Retail / 目标零售价', product.retail === 'To be confirmed' ? 'To be confirmed / 待确认' : product.retail)}
          </table>
        </div>
        <div class="notes">
          <div>
            <h3>Workmanship / 工艺说明</h3>
            <p>${esc(product.description || '')}</p>
          </div>
          <div>
            <h3>Remarks / 备注</h3>
            <div class="lines"></div>
          </div>
        </div>
        <table class="measure">
          <thead><tr><th>Point of Measure / 部位</th><th>S</th><th>M</th><th>L</th><th>XL</th><th>Tolerance / 公差</th></tr></thead>
          <tbody>
            ${['Chest / 胸围', 'Shoulder / 肩宽', 'Length / 衣长', 'Sleeve / 袖长', 'Waist / 腰围']
              .map(label => `<tr><td>${label}</td><td></td><td></td><td></td><td></td><td>±1.0</td></tr>`).join('')}
          </tbody>
        </table>
        <footer><span>SOHO FASHION · 工艺单 TECH PACK</span><span>${esc(product.code)}</span></footer>
      </section>`;
    };

    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>工艺单 Tech Pack</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; font-family: Helvetica, Arial, "Microsoft YaHei", sans-serif; }
        .pack { page-break-after: always; padding: 2mm 0 4mm; }
        .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111; padding-bottom: 5px; }
        .brand { font-size: 12px; font-weight: 700; letter-spacing: .06em; }
        .doc { font-size: 20px; font-weight: 700; }
        .meta { font-size: 9px; color: #444; }
        .fields { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #111; border-top: 0; }
        .fields div { padding: 7px 10px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; }
        .fields span { display: block; font-size: 7.5px; color: #555; letter-spacing: .03em; text-transform: uppercase; }
        .fields b { display: block; font-size: 11px; margin-top: 1px; }
        .layout { display: grid; grid-template-columns: 58% 1fr; gap: 7mm; margin-top: 6mm; }
        .images { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; align-content: start; }
        .images .main { grid-column: 1 / -1; width: 100%; height: 105mm; object-fit: contain; background: #f5f4f0; }
        .images .thumb { width: 100%; height: 45mm; object-fit: cover; background: #f5f4f0; }
        .info { width: 100%; border-collapse: collapse; font-size: 9px; }
        .info th { width: 40%; text-align: left; font-weight: 600; background: #f5f4f0; border: 1px solid #ccc; padding: 5px 6px; vertical-align: top; }
        .info td { border: 1px solid #ccc; padding: 5px 6px; }
        .notes { display: grid; grid-template-columns: 1.3fr 1fr; gap: 6mm; margin-top: 6mm; }
        .notes h3 { margin: 0 0 1.5mm; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; }
        .notes p { margin: 0; font-size: 9px; line-height: 1.55; }
        .lines { height: 18mm; border-bottom: 1px solid #bbb; background: repeating-linear-gradient(transparent, transparent 6mm, #eee 6mm, #eee 6.2mm); }
        .measure { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 9px; }
        .measure th, .measure td { border: 1px solid #999; padding: 5px 6px; text-align: center; }
        .measure th { background: #e9eef0; font-weight: 700; }
        .measure td:first-child, .measure th:first-child { text-align: left; width: 40%; }
        footer { display: flex; justify-content: space-between; margin-top: 5mm; border-top: 1px solid #111; padding-top: 3px; font-size: 8px; color: #555; }
      </style></head><body>${items.map(section).join('')}
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
    const excelButton = el('button', 'btn-accent', 'Export tech pack (Excel)');
    excelButton.type = 'button';
    excelButton.addEventListener('click', () => {
      toast('Preparing Excel tech pack…');
      exportExcel(items).catch(error => toast(`Excel export failed: ${error.message}`));
    });
    const techPackButton = el('button', 'btn-outline', 'Print tech pack (PDF)');
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
    aside.append(excelButton, techPackButton, clear);
    aside.append(el('p', 'sel-note', 'Excel tech pack is editable for BOM, costs and measurements. PDF is for review. Feedback is collected on each style page.'));

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
