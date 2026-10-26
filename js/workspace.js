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
  const REASON_LABELS = {
    good_fit: 'Good fit',
    review_price: 'Review price',
    other_material: 'Change material',
    adjust_fit: 'Adjust fit',
    other: 'Other'
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  let state;
  let identity;
  let activeTab = 'style';
  let selectedProductId = null;

  function latestSubmissions() {
    const latest = new Map();
    (state.submissions || []).forEach(submission => {
      const key = submission.storeId + '::' + submission.roundId;
      const current = latest.get(key);
      if (!current || submission.version > current.version) latest.set(key, submission);
    });
    return [...latest.values()];
  }

  function itemsOf(submission) {
    return (submission.snapshots || []).map(snapshot => snapshot.item).filter(Boolean);
  }

  function storeName(id) {
    const store = (state.stores || []).find(item => item.id === id);
    return store ? store.name : 'Unknown store';
  }

  function productOf(id) {
    return (state.products || []).find(item => item.id === id) || { name: 'Unknown style', code: '' };
  }

  function materialName(id) {
    const option = (state.materialOptions || []).find(item => item.id === id);
    return option ? option.name : 'Not selected';
  }

  function selectedSummary() {
    const submissions = latestSubmissions();
    const byProduct = new Map();
    submissions.forEach(submission => {
      itemsOf(submission).forEach(item => {
        if (!byProduct.has(item.productId)) {
          byProduct.set(item.productId, { productId: item.productId, stores: new Set(), materials: new Map(), reasons: new Map(), comments: [] });
        }
        const entry = byProduct.get(item.productId);
        entry.stores.add(submission.storeId);
        const material = materialName(item.materialOptionId);
        entry.materials.set(material, (entry.materials.get(material) || 0) + 1);
        (item.reasons || []).forEach(reason => entry.reasons.set(reason, (entry.reasons.get(reason) || 0) + 1));
        if (item.comment) entry.comments.push({ store: storeName(submission.storeId), text: item.comment, code: submission.receiptNumber });
      });
    });
    return byProduct;
  }

  function voteCount(productId) {
    return (state.votes || []).filter(vote => vote.productId === productId).length;
  }

  function renderByStyle() {
    const summary = selectedSummary();
    const table = el('table', 'ws-table');
    const head = el('tr');
    ['STYLE', 'STORES', 'VOTES', 'MATERIAL', 'REQUESTS', 'NEXT ACTION'].forEach(label => head.append(el('th', null, label)));
    table.append(head);
    summary.forEach(entry => {
      const product = productOf(entry.productId);
      const row = el('tr');
      row.className = selectedProductId === entry.productId ? 'selected' : '';
      const style = el('td');
      style.append(el('strong', null, product.name), el('small', null, product.code));
      row.append(style, el('td', null, String(entry.stores.size)), el('td', null, String(voteCount(entry.productId))));
      const materials = [...entry.materials.entries()].map(([name, count]) => `${name} (${count})`).join(', ');
      row.append(el('td', null, materials || '—'));
      row.append(el('td', null, String(entry.comments.length)));
      row.append(el('td', null, 'Review feedback'));
      row.addEventListener('click', () => {
        selectedProductId = entry.productId;
        render();
        renderDetail();
      });
      table.append(row);
    });
    return table;
  }

  function renderByStore() {
    const table = el('table', 'ws-table');
    const head = el('tr');
    ['STORE', 'VERSION', 'SUBMITTED', 'STYLES', 'SAMPLE', 'STATUS'].forEach(label => head.append(el('th', null, label)));
    table.append(head);
    latestSubmissions().forEach(submission => {
      const items = itemsOf(submission);
      const row = el('tr');
      row.append(el('td', null, storeName(submission.storeId)));
      row.append(el('td', null, 'v' + submission.version));
      row.append(el('td', null, new Date(submission.submittedAt).toLocaleString('en-CA')));
      row.append(el('td', null, String(items.length)));
      row.append(el('td', null, items.some(item => item.sampleKind && item.sampleKind !== 'not_yet') ? 'Requested' : '—'));
      row.append(el('td', null, 'Submitted'));
      table.append(row);
    });
    return table;
  }

  function renderNotes() {
    const wrap = el('div');
    const briefs = state.revisionBriefs || [];
    if (!briefs.length) {
      wrap.append(el('p', 'ws-empty', 'No development notes yet. Select a style and create one from the detail panel.'));
      return wrap;
    }
    const table = el('table', 'ws-table');
    const head = el('tr');
    ['STYLE', 'ACTION', 'OWNER', 'DUE', 'STATUS'].forEach(label => head.append(el('th', null, label)));
    table.append(head);
    briefs.forEach(brief => {
      const product = productOf(brief.productId);
      const row = el('tr');
      row.append(el('td', null, product.name), el('td', null, brief.action), el('td', null, brief.owner || '—'), el('td', null, brief.dueDate || '—'), el('td', null, brief.status));
      table.append(row);
    });
    wrap.append(table);
    return wrap;
  }

  function renderTable() {
    const box = document.getElementById('ws-table');
    box.innerHTML = '';
    if (activeTab === 'style') box.append(renderByStyle());
    if (activeTab === 'store') box.append(renderByStore());
    if (activeTab === 'notes') box.append(renderNotes());
  }

  function renderDetail() {
    const box = document.getElementById('ws-detail');
    box.innerHTML = '';
    const summary = selectedSummary();
    const entry = selectedProductId ? summary.get(selectedProductId) : [...summary.values()][0];
    if (!entry) {
      box.append(el('p', 'ws-empty', 'Select a style with submitted feedback.'));
      return;
    }
    const product = productOf(entry.productId);
    const img = document.createElement('img');
    img.src = IMAGES[product.code] || 'assets/img/womens-look-green.webp';
    img.alt = product.name;
    box.append(img);
    box.append(el('h3', null, product.name));
    box.append(el('p', 'ws-code', product.code));
    box.append(el('p', 'ws-label', 'EXAMPLE FEEDBACK'));
    entry.comments.slice(0, 3).forEach(comment => {
      const card = el('div', 'ws-quote');
      card.append(el('p', null, `“${comment.text}”`));
      card.append(el('small', null, `${comment.store} · ${comment.code}`));
      box.append(card);
    });
    if (!entry.comments.length) box.append(el('p', 'ws-empty', 'No written comments.'));

    const form = el('form', 'ws-brief-form');
    form.append(el('p', 'ws-label', 'CREATE DEVELOPMENT NOTE'));
    const action = document.createElement('select');
    ['Compare or change fabric', 'Request quote', 'Revise fit', 'Update colour', 'Request sample', 'Hold', 'Proceed'].forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      action.append(option);
    });
    const owner = document.createElement('input');
    owner.type = 'text';
    owner.placeholder = 'Owner';
    const due = document.createElement('input');
    due.type = 'date';
    const submit = el('button', 'btn-accent', 'Create revision brief');
    submit.type = 'submit';
    form.append(action, owner, due, submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      state.revisionBriefs = state.revisionBriefs || [];
      state.revisionBriefs.push({
        id: 'brief-' + Date.now(),
        productId: entry.productId,
        action: action.value,
        owner: owner.value.trim(),
        dueDate: due.value,
        status: 'Draft',
        createdAt: new Date().toISOString()
      });
      await DemoStore.save(state);
      selectedProductId = entry.productId;
      activeTab = 'notes';
      document.querySelectorAll('.ws-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'notes'));
      renderTable();
      renderDetail();
    });
    box.append(form);
  }

  function csvCell(value) {
    let text = String(value == null ? '' : value);
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    if (/[",\n\r]/.test(text)) text = '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function downloadCsv(name, rows) {
    const content = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function exportFeedback() {
    const rows = [['Collection', 'Round', 'Store', 'Style', 'Code', 'Material', 'Reasons', 'Comment', 'Sample', 'Submitted', 'Receipt']];
    latestSubmissions().forEach(submission => {
      itemsOf(submission).forEach(item => {
        const product = productOf(item.productId);
        rows.push([
          'Everyday Essentials', 'Autumn Edit 01 demo review', storeName(submission.storeId),
          product.name, product.code, materialName(item.materialOptionId),
          (item.reasons || []).map(reason => REASON_LABELS[reason] || reason).join('; '),
          item.comment || '', item.sampleKind || '', submission.submittedAt, submission.receiptNumber
        ]);
      });
    });
    downloadCsv('marks-feedback.csv', rows);
  }

  function exportBrief() {
    const rows = [['Style', 'Code', 'Action', 'Owner', 'Due', 'Status']];
    (state.revisionBriefs || []).forEach(brief => {
      const product = productOf(brief.productId);
      rows.push([product.name, product.code, brief.action, brief.owner || '', brief.dueDate || '', brief.status]);
    });
    downloadCsv('revision-brief.csv', rows);
  }

  function renderIdentity() {
    const select = document.getElementById('ws-identity');
    select.innerHTML = '';
    (state.demoIdentities || []).forEach(person => {
      const option = document.createElement('option');
      option.value = person.userId;
      option.textContent = `${person.displayName} · ${person.role}`;
      if (identity && identity.userId === person.userId) option.selected = true;
      select.append(option);
    });
    if (!identity) {
      identity = (state.demoIdentities || []).find(person => person.role === 'marks_reviewer') || state.demoIdentities[0];
      DemoStore.setIdentity(identity);
    }
    select.addEventListener('change', () => {
      identity = (state.demoIdentities || []).find(person => person.userId === select.value);
      DemoStore.setIdentity(identity);
      renderIdentityLabel();
    });
    renderIdentityLabel();
  }

  function renderIdentityLabel() {
    document.getElementById('ws-role').textContent = identity ? `${identity.displayName}` : 'Demo';
  }

  function render() {
    renderTable();
  }

  DemoStore.state().then(payload => {
    state = payload;
    identity = DemoStore.identity();
    renderIdentity();
    render();
    renderDetail();
    document.querySelectorAll('.ws-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        document.querySelectorAll('.ws-tab').forEach(item => item.classList.toggle('active', item === tab));
        renderTable();
      });
    });
    document.getElementById('export-feedback').addEventListener('click', exportFeedback);
    document.getElementById('export-brief').addEventListener('click', exportBrief);
  });
})();
