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
      const img = new Image();
      img.src = src;
      await img.decode();
      const maxWidth = 700;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    };
    const imageCache = {};
    for (const product of items) {
      imageCache[product.code] = await Promise.all(viewsOf(product).slice(0, 4).map(toPng));
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
    const mats = materialMap();
    const date = new Date().toLocaleDateString();
    const season = 'Apparel Fall-Winter 2027 / 秋冬 2027';
    const esc = value => String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const mainImage = product => {
      const src = (product.views && product.views.length ? product.views[0] : product.image);
      return new URL(src, location.href).href;
    };
    const allImages = product => (product.views && product.views.length ? product.views : [product.image])
      .map(src => new URL(src, location.href).href);

    const header = (product, page, pages) => `
      <header class="tp-head">
        <div class="tp-logo">SOHO<span>FASHION</span></div>
        <div class="tp-hfields">
          <div class="f wide"><label>Product Description / 产品描述</label><b>${esc(product.name)}</b></div>
          <div class="f"><label>Season Name / 季节</label><b>${season}</b></div>
          <div class="f"><label>Date / 日期</label><b>${date}</b></div>
          <div class="f"><label>Design # / 设计编号</label><b>${esc(product.code)}</b></div>
          <div class="f"><label>Product # / 产品编号</label><b>${esc(product.code)}</b></div>
        </div>
      </header>
      <div class="tp-sub">
        <div class="f"><label>Brand / 品牌</label><b>SOHO FASHION</b></div>
        <div class="f"><label>Banner / 渠道</label><b>Mark's</b></div>
        <div class="f"><label>Category (L3)</label><b>${bi('gender', product.gender)}</b></div>
        <div class="f"><label>Sub-Category (L4)</label><b>${bi('type', product.type)}</b></div>
        <div class="f"><label>Class (L5)</label><b>${bi('type', product.type)}</b></div>
        <div class="f"><label>Sub-Class (L6)</label><b>PRO</b></div>
        <div class="tp-thumb"><img src="${mainImage(product)}" alt=""></div>
      </div>
      <div class="tp-sub">
        <div class="f"><label>PRO Engineer</label><b>To be confirmed</b></div>
        <div class="f"><label>Product Designer</label><b>To be confirmed</b></div>
        <div class="f"><label>TD Specialist</label><b>To be confirmed</b></div>
        <div class="f"><label>Product Developer</label><b>To be confirmed</b></div>
        <div class="f"><label>PRO Merch</label><b>To be confirmed</b></div>
        <div class="tp-pageno">Page ${page} of ${pages}</div>
      </div>`;

    const bomCells = values => values.map(value => `<td>${value == null || value === '' ? '—' : value}</td>`).join('');

    const bomPage = (product, page, pages) => {
      const colour = (product.colours && product.colours[0]) ? product.colours[0].name : '';
      const shell = bi('material', product.material);
      const selected = mats[product.code] ? bi('material', mats[product.code]) : '待确认 / TBC';
      const head = ['Placement / 部位', 'Supplier / 供应商', 'Supplier Ref. / 供应商料号', 'Material Ref. / 材料编号',
        'Material Description / 材料描述', 'Status / 状态', 'Color / 颜色', 'UOM / 单位', 'Consumption / 用量', 'Price / 单价', 'Comments / 备注'];
      return `<section class="tp-page">
        ${header(product, page, pages)}
        <div class="tp-section">Section: Fabrics / 面料</div>
        <table class="tp-table">
          <thead><tr>${head.map(text => `<th>${text}</th>`).join('')}</tr></thead>
          <tbody>
            <tr>${bomCells(['Fabric A : Shell fabric / 主面料', 'To be confirmed', '—', '—', shell + ' · Composition TBC', 'In Development', colour, 'm', '0.00', '$0.000', 'Body fabric'])}</tr>
            <tr>${bomCells(['Fabric B : Selected material / 选中材料', 'To be confirmed', '—', '—', selected + ' · Composition TBC', 'In Development', colour, 'm', '0.00', '$0.000', 'Selected by store'])}</tr>
          </tbody>
        </table>
        <div class="tp-section">Section: Trims / 辅料</div>
        <table class="tp-table">
          <thead><tr>${head.map(text => `<th>${text}</th>`).join('')}</tr></thead>
          <tbody>
            <tr>${bomCells(['Main label / 主标', 'To be confirmed', '—', '—', 'Brand label', 'In Development', '—', 'each', '1.00', '$0.000', '—'])}</tr>
            <tr>${bomCells(['Care label / 洗标', 'To be confirmed', '—', '—', 'Care & content label', 'In Development', '—', 'each', '1.00', '$0.000', '—'])}</tr>
            <tr>${bomCells(['Main hangtag / 吊牌', 'To be confirmed', '—', '—', 'Hangtag', 'In Development', '—', 'each', '1.00', '$0.000', '—'])}</tr>
            <tr>${bomCells(['Polybag / 胶袋', 'Factory source', '—', '—', 'Recycled polybag', 'In Development', 'Clear', 'each', '1.00', '$0.000', '—'])}</tr>
          </tbody>
        </table>
        <div class="tp-foot">SOHO FASHION · BOM · ${esc(product.code)}</div>
      </section>`;
    };

    const cadPage = (product, page, pages) => {
      const images = allImages(product);
      const points = [['Chest / 胸围'], ['Shoulder / 肩宽'], ['Length / 衣长'], ['Sleeve / 袖长'], ['Waist / 腰围']];
      return `<section class="tp-page">
        ${header(product, page, pages)}
        <div class="tp-doc-title">CAD SKETCH / 产品图</div>
        <div class="tp-brandline">SOHO FASHION &nbsp;|&nbsp; MARK'S &nbsp;|&nbsp; ${esc(product.code)} &nbsp;|&nbsp; ${season}</div>
        <div class="tp-cadimgs">
          ${images.slice(0, 4).map(src => `<img src="${src}" alt="${esc(product.name)}">`).join('')}
        </div>
        <div class="tp-notes">
          <div><h3>Workmanship / 工艺说明</h3><p>${esc(product.description || '')}</p></div>
          <div><h3>Remarks / 备注</h3><div class="tp-lines"></div></div>
        </div>
        <div class="tp-section">Measurement Spec / 尺寸表（cm）</div>
        <table class="tp-table measure">
          <thead><tr><th>Point of Measure / 部位</th><th>S</th><th>M</th><th>L</th><th>XL</th><th>Tolerance / 公差</th></tr></thead>
          <tbody>${points.map(([label]) => `<tr><td>${label}</td><td></td><td></td><td></td><td></td><td>±1.0</td></tr>`).join('')}</tbody>
        </table>
        <div class="tp-foot">SOHO FASHION · TECH PACK · ${esc(product.code)}</div>
      </section>`;
    };

    const pagesPerStyle = 2;
    const totalPages = items.length * pagesPerStyle;
    const sections = items.map((product, index) => {
      const base = index * pagesPerStyle + 1;
      return bomPage(product, base, totalPages) + cadPage(product, base + 1, totalPages);
    }).join('');

    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>工艺单 Tech Pack</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; font-family: Helvetica, Arial, "Microsoft YaHei", sans-serif; font-size: 10px; }
        .tp-page { page-break-after: always; padding: 0 0 4mm; }
        .tp-head { display: grid; grid-template-columns: 34mm 1fr; border: 1px solid #111; }
        .tp-logo { display: flex; flex-direction: column; justify-content: center; padding: 3mm; font-size: 16px; font-weight: 800; letter-spacing: .06em; border-right: 1px solid #111; }
        .tp-logo span { font-size: 9px; letter-spacing: .22em; font-weight: 500; border-top: 2px solid #111; margin-top: 2px; padding-top: 2px; }
        .tp-hfields { display: flex; flex-wrap: wrap; }
        .tp-hfields .f { flex: 1 1 30%; padding: 2mm 3mm; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; }
        .tp-hfields .f.wide { flex: 1 1 100%; border-right: 0; }
        label { display: block; font-size: 7px; letter-spacing: .04em; color: #555; text-transform: uppercase; }
        b { display: block; font-size: 10px; font-weight: 600; margin-top: 1px; }
        .tp-sub { display: flex; border: 1px solid #111; border-top: 0; align-items: stretch; }
        .tp-sub .f { flex: 1; padding: 2mm 3mm; border-right: 1px solid #ccc; }
        .tp-thumb { width: 26mm; padding: 1mm; border-left: 1px solid #ccc; }
        .tp-thumb img { width: 100%; height: 22mm; object-fit: contain; }
        .tp-pageno { margin-left: auto; padding: 2mm 3mm; font-size: 8px; color: #555; align-self: center; }
        .tp-section { background: #e9eef0; border: 1px solid #111; border-top: 0; padding: 1.5mm 3mm; font-size: 10px; font-weight: 700; }
        .tp-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .tp-table th { background: #dfe7ea; border: 1px solid #111; padding: 2mm 1.5mm; font-size: 8px; text-align: left; font-weight: 700; }
        .tp-table td { border: 1px solid #999; padding: 2mm 1.5mm; font-size: 8.5px; vertical-align: top; }
        .tp-table th:nth-child(1), .tp-table td:nth-child(1) { width: 17%; }
        .tp-table th:nth-child(5), .tp-table td:nth-child(5) { width: 20%; }
        .tp-table.measure th, .tp-table.measure td { text-align: center; }
        .tp-table.measure td:first-child, .tp-table.measure th:first-child { text-align: left; width: 34%; }
        .tp-doc-title { margin-top: 6mm; font-size: 16px; font-weight: 800; border-bottom: 2px solid #111; padding-bottom: 1mm; }
        .tp-brandline { margin-top: 2mm; font-size: 8px; letter-spacing: .08em; color: #444; }
        .tp-cadimgs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-top: 4mm; }
        .tp-cadimgs img { width: 100%; height: 88mm; object-fit: contain; background: #f5f4f0; border: 1px solid #ddd; }
        .tp-notes { display: grid; grid-template-columns: 1.2fr 1fr; gap: 6mm; margin-top: 5mm; }
        .tp-notes h3 { font-size: 9px; margin: 0 0 1.5mm; letter-spacing: .05em; }
        .tp-notes p { margin: 0; font-size: 9px; line-height: 1.55; }
        .tp-lines { height: 20mm; border-bottom: 1px solid #bbb; background: repeating-linear-gradient(transparent, transparent 6mm, #eee 6mm, #eee 6.2mm); }
        .tp-foot { margin-top: 4mm; border-top: 1px solid #111; padding-top: 1mm; font-size: 7.5px; color: #555; }
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
    const excelButton = el('button', 'btn-accent', 'Export tech pack (Excel)');
    excelButton.type = 'button';
    excelButton.addEventListener('click', () => exportExcel(items));
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
    aside.append(excelButton, techPackButton, exportButton, submit, clear);
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
