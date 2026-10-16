(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = 'soho-city-edit-preview-v1';
  let data = { saved: [], votes: [], comments: {}, preferences: [], language: 'en' };
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (stored && typeof stored === 'object') {
      for (const field of ['saved', 'votes', 'preferences']) if (Array.isArray(stored[field])) data[field] = stored[field].filter(v => typeof v === 'string');
      if (stored.comments && typeof stored.comments === 'object' && !Array.isArray(stored.comments)) data.comments = stored.comments;
      if (stored.language === 'zh') data.language = 'zh';
    }
  } catch (_) { /* The preview remains usable when local storage is unavailable. */ }
  let language = data.language, filter = 'all', activeProduct = null, toastTimer;
  let preferences = [...data.preferences].slice(0, 3);
  const staticEnglish = {};
  $$('[data-t]').forEach(el => { staticEnglish[el.dataset.t] = el.innerHTML; });
  const chinese = {
    topline:'重新发现，日常穿着的可能',conceptPreview:'概念预览 ↗',navEdit:'本期精选',navDetails:'面料与细节',navVoice:'你的想法',myEdit:'我的选款',
    heroEyebrow:'城市日常 / 第 01 辑',heroTitle:'自在穿行，<br>从容有型。',heroDescription:'考究的层次，日常的新意。<br>让你的想法，参与下一件好衣服。',explore:'探索本期精选',heroSeason:'探索都市日常的穿着方式',
    introEyebrow:'不只是选款，更是一次交流',introTitle:'好设计，<br>从倾听开始。',introText:'逛一逛，收藏让你心动的款式。也欢迎告诉我们，怎样的面料、版型和细节更适合你。你的意见，将帮助我们完善下一步的设计。',step1:'发现款式',step2:'选出喜欢',step3:'分享意见',
    collectionEyebrow:'本期灵感',collectionTitle:'每周精选。',collectionNote:'先从四个款式方向开始。<br>哪一件，更适合你的日常？',all:'全部款式',women:'女装',men:'男装',unisex:'中性款',sort:'排序',sortEditorial:'按推荐顺序',sortSaved:'优先显示已收藏',sortName:'按名称排序',noResults:'还没有找到合适的款式。',trySearch:'换个关键词，或浏览全部款式。',clearFilters:'清除筛选',collectionDisclosure:'概念款式说明：图片及面料方向为示意，待实际推款资料确认后替换。',
    materialCaption:'肌理 / 版型 / 日常穿着',materialEyebrow:'近看，每一个细节',materialTitle:'让细节，<br>为日常加分。',materialText:'更柔和的手感，恰到好处的厚度，更自在的活动空间。我们希望把实用的细节，变成每天都能感受到的舒适。',material1:'有质感的面料',material1Text:'探索帆布、肌理针织与柔和挺括的梭织面料。',material2:'适合多种场合的版型',material2Text:'舒展的比例，轻松的叠穿，从工作日穿到周末。',materialCta:'告诉我们，你更在意什么',
    voiceEyebrow:'听听你的想法',voiceTitle:'一件好衣服，<br>你最在乎什么？',voiceText:'选出最重要的三项。<br>对具体款式有想法？打开款式详情，留下你的意见。',saveView:'保存我的偏好',localNote:'互动预览：你的选择和评论仅保存在当前设备。',
    mailEyebrow:'每周精选邮件',mailTitle:'每周新意，<br>轻松送达。',mailText:'每周一封精选邮件：新款概要、推荐重点，<br>以及可以直接浏览款式的链接。',consent:'我愿意通过邮件接收每周精选。',previewEmail:'预览每周推款邮件 ↗',emailDemo:'当前为流程预览，尚未发送邮件。',
    footerText:'用心做衣服，认真听想法。',about:'关于本次推款',footerNote:'为 Mark’s 提案 · 概念预览版',official:'访问 Mark’s 官方网站 ↗',personalEdit:'你的专属选款清单',savedTitle:'把喜欢的，<br>留在这里。',export:'下载我的选款清单',savedNote:'保留选款清单，方便继续交流款式与意见。',infoTitle:'从这一版，开始交流。',infoText:'本次概念版包含每周推款、收藏选款和单款评论。款式、面料及示例评论均为演示内容；你的选择和评论仅保存在当前设备。正式使用前，需要接入共享反馈数据和每周邮件发送服务。',infoText2:'由 SOHO Fashion 为 Mark’s 制作的推款提案，非 Mark’s 官方零售网站。',gotIt:'知道了'
  };
  const words = {
    search:['Search pieces or fabrics','搜索款式或面料'],email:['Your email address','你的邮箱地址'],pieces:['pieces','款'],concept:['CONCEPT 01','概念款'],view:['DISCOVER THIS PIECE ↗','查看款式详情 ↗'],save:['Save to my edit','加入我的选款'],saved:['Saved to my edit','已加入我的选款'],remove:['Remove','移除'],vote:['I like this','我喜欢这款'],voted:['You like this','你喜欢这款'],localVote:['Your device vote','当前设备投票'],
    savedToast:['Added to your edit.','已加入你的选款清单。'],removedToast:['Removed from your edit.','已从选款清单移除。'],voteToast:['Your preference is saved on this device.','你的喜好已保存在当前设备。'],unsavedToast:['Your preference has been removed.','已取消本次投票。'],emptySaved:['Your edit is waiting for you. Save a piece to start your selection.','选款清单还是空的，先收藏你喜欢的款式吧。'],
    material:['Proposed fabric','拟定面料'],colour:['Colour direction','配色方向'],fit:['Fit direction','版型方向'],detailNote:['Concept only. Fabric composition, sizing and final details are not yet confirmed.','此款为概念示意，面料成分、尺码和最终细节尚未确认。'],discussion:['The conversation','款式评论'],discussionNote:['Example feedback + your local preview comments','示例意见 + 本设备的预览评论'],example:['Illustrative comment · not customer feedback','示例评论 · 非真实客户反馈'],exampleName:['Example visitor','示例访客'],yourComment:['Your preview comment','你的预览评论'],nickname:['Display name (optional)','昵称（选填）'],nicknamePlaceholder:['How should we call you?','怎么称呼你？'],commentLabel:['What do you think of this piece?','你对这款有什么看法？'],commentPlaceholder:['Tell us about the colour, fabric, fit or a detail you would change…','可以说说配色、面料、版型，或你希望调整的细节……'],commentPolicy:['Please don’t share personal contact details. In this preview, comments are visible only on this device.','请勿填写私人联系方式。当前预览版的评论仅在此设备可见。'],post:['Share my thoughts','提交我的意见'],commentToast:['Your comment has been added to this device’s preview.','意见已加入当前设备的预览评论。'],commentEmpty:['Please write a short comment first.','请先填写你的意见。'],guest:['Guest','访客'],
    maxPreferences:['Choose up to three priorities.','最多选择三项偏好。'],selectPreference:['Choose at least one priority.','请至少选择一项偏好。'],savedPreferences:['Your perspective is saved on this device. Thank you.','偏好已保存在当前设备，谢谢你的分享。'],selected:['selected','已选择'],
    subscribeSuccess:['Preview complete. This address has not been subscribed or sent to a server; no email will be sent.','订阅流程预览完成。邮箱未提交到服务器，也没有真实订阅或邮件发送。'],emailTitle:['A fresh perspective<br>for your everyday.','为日常，<br>带来一点新意。'],emailIntro:['This week: four considered concepts, from versatile utility layers to a textured knit and relaxed tailoring. Explore each piece and share your point of view.','本期四个款式方向：实用外套、肌理针织与从容的廓形长裤。点击浏览款式，也欢迎留下你的想法。'],emailLabel:['WEEKLY EMAIL PREVIEW','每周邮件预览'],emailSubject:['Subject: The City Edit / Four new directions','主题：城市日常 / 四个新款方向'],emailFrom:['From: SOHO Fashion · to subscribed Mark’s contacts','发件人：SOHO Fashion · 收件人：已订阅的 Mark’s 联系人'],emailCta:['Explore the full edit ↗','浏览本期全部款式 ↗'],emailFooter:['You are viewing an email mockup. A live mailing service and unsubscribe management are not connected.','你正在查看邮件样稿。真实邮件发送及退订管理尚未接入。'],exportTitle:['SOHO FASHION — MY CITY EDIT','SOHO FASHION — 我的选款清单'],exportNote:['Concept selection. Fabrics and specifications are illustrative and await confirmation.','概念选款清单。面料及规格为示意，待实际资料确认。'],exportToast:['Your selection is ready to download.','选款清单已生成，可以下载。'],storageWarning:['Saved for this visit only: device storage is unavailable.','设备存储不可用，内容仅在本次访问中保留。'],minComments:['Please keep comments within 500 characters.','评论请控制在 500 字以内。']
  };
  const t = key => words[key] ? words[key][language === 'zh' ? 1 : 0] : (language === 'zh' ? chinese[key] : staticEnglish[key]) || key;
  const products = [
    { id:'city-chore', code:'CE-001', category:'men', image:'navy-jacket.png', swatch:'#24303d', name:['City chore jacket','都市工装外套'], fabric:['Cotton canvas direction','棉质帆布方向'], colour:['Deep navy','深海军蓝'], fit:['Relaxed, easy to layer','宽松版型，便于叠穿'], description:['A clean take on the everyday utility jacket. Patch pockets, a straight silhouette and a quiet navy tone bring a practical layer to city dressing.','以简洁线条重新诠释日常工装。贴袋、利落廓形与低调海军蓝，兼顾城市穿着的层次与实用性。'], example:['I like the clean shape. Could the fabric feel softer for all-day wear?','我喜欢简洁的廓形。如果面料能更柔软，全天穿着会不会更舒服？'] },
    { id:'form-utility', code:'CE-002', category:'women', image:'sand-jacket.png', swatch:'#c5b296', name:['Form utility jacket','轻廓形实用夹克'], fabric:['Cotton twill direction','棉质斜纹方向'], colour:['Warm sand','暖沙色'], fit:['Gently shaped waist, hip length','柔和腰线，及臀长度'], description:['A warm neutral layer with considered pockets and a gently shaped waist. Designed as a starting point for everyday styling, from simple knits to relaxed trousers.','温暖的中性色、实用口袋与柔和腰线，为日常搭配提供更多可能。可以与基础针织或舒展长裤组合。'], example:['The neutral colour is easy to style. I would like enough room to wear a knit underneath.','这个中性色很好搭，希望里面穿针织时，肩部和袖子也有足够空间。'] },
    { id:'everyday-knit', code:'CE-003', category:'unisex', image:'ivory-knit.png', swatch:'#e5ddc9', name:['Everyday textured knit','日常肌理针织衫'], fabric:['Textured knit direction','肌理针织方向'], colour:['Soft ivory','柔和象牙白'], fit:['Easy fit, classic crew neck','舒展版型，经典圆领'], description:['Subtle texture and a soft ivory palette make this crew neck an understated foundation. Tell us what hand feel and weight would work best for your everyday.','细腻肌理与柔和象牙白，让经典圆领成为日常衣橱的基础。欢迎告诉我们，你更喜欢怎样的手感与厚薄。'], example:['A lighter-weight version would be useful indoors. Easy care matters to me too.','室内穿的话，希望有薄一点的版本；是否容易打理也很重要。'] },
    { id:'modern-pleat', code:'CE-004', category:'women', image:'charcoal-trouser.png', swatch:'#535350', name:['Modern pleated trouser','现代褶裥阔腿长裤'], fabric:['Soft structured woven direction','柔和挺括梭织方向'], colour:['Charcoal grey','炭灰色'], fit:['Relaxed wide leg, front pleats','宽松阔腿，前片褶裥'], description:['Relaxed tailoring with an urban point of view. Front pleats and a generous leg create an easy silhouette, ready to pair with the rest of the edit.','从容剪裁融入都市穿着。前片褶裥与舒展裤腿塑造轻松廓形，可与本期外套及针织搭配。'], example:['I like the relaxed leg. A choice of lengths would make finding the right fit easier.','喜欢这个宽松裤型，如果有不同裤长可选，会更容易找到合适的版型。'] }
  ];
  const priorities = [{id:'comfort',en:'Comfort & feel',zh:'舒适与手感'},{id:'fit',en:'Fit & movement',zh:'版型与活动感'},{id:'care',en:'Easy care',zh:'易打理'},{id:'lasting',en:'Lasting quality',zh:'耐穿品质'},{id:'style',en:'Versatile style',zh:'百搭风格'},{id:'colour',en:'Colour & texture',zh:'颜色与肌理'},{id:'value',en:'Value',zh:'价格与价值'}];
  const content = value => value[language === 'zh' ? 1 : 0];
  const icon = (kind, filled = false) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5">${kind === 'heart' ? '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>' : '<path d="M6 3h12v18l-6-4-6 4V3Z"/>'}</svg>`;
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3400); }
  function persist() { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch (_) { toast(t('storageWarning')); return false; } }
  function openDialog(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }
  function renderProducts() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    const shown = products.filter(p => (filter === 'all' || p.category === filter) && [p.code,...p.name,...p.fabric,...p.colour,p.category].join(' ').toLocaleLowerCase().includes(query));
    if ($('#sort').value === 'saved') shown.sort((a,b) => Number(data.saved.includes(b.id)) - Number(data.saved.includes(a.id)));
    if ($('#sort').value === 'name') shown.sort((a,b) => content(a.name).localeCompare(content(b.name),language === 'zh' ? 'zh-CN' : 'en'));
    $('#result-count').textContent = `${String(shown.length).padStart(2,'0')} ${t('pieces')} / ${String(products.length).padStart(2,'0')}`;
    $('#no-results').hidden = !!shown.length;
    $('#products').innerHTML = shown.map(p => {
      const saved = data.saved.includes(p.id), voted = data.votes.includes(p.id);
      return `<article class="product-card"><div class="product-visual"><button class="product-open" data-product="${p.id}" aria-label="${escape(content(p.name))}"><img src="assets/${p.image}" alt="${escape(content(p.name))}" loading="lazy"><span class="quick-view">${t('view')}</span></button><span class="product-tag">${t('concept')}</span><button class="save-product ${saved ? 'selected' : ''}" data-save="${p.id}" aria-pressed="${saved}" aria-label="${t(saved ? 'saved' : 'save')} — ${escape(content(p.name))}">${icon('bookmark',saved)}</button></div><div class="product-meta"><span>${t(p.category)}</span><span>${p.code}</span></div><button class="product-title" data-product="${p.id}">${content(p.name)}</button><p class="product-fabric">${content(p.fabric)}</p><div class="card-bottom"><span><i class="color-dot" style="background:${p.swatch}"></i><small>${content(p.colour)}</small></span><button class="like-product ${voted ? 'selected' : ''}" data-vote="${p.id}" aria-pressed="${voted}" aria-label="${t(voted ? 'voted' : 'vote')} — ${escape(content(p.name))}">${icon('heart',voted)} ${t(voted ? 'voted' : 'vote')}</button></div></article>`;
    }).join('');
    $('#saved-count').textContent = products.filter(p => data.saved.includes(p.id)).length;
  }
  function commentsFor(id) { return Array.isArray(data.comments[id]) ? data.comments[id].filter(c => c && typeof c.text === 'string').slice(-50) : []; }
  function renderComments(p) {
    return `<div class="comment"><div class="comment-byline"><strong>${t('exampleName')}</strong><span>${t('example')}</span></div><p>${content(p.example)}</p></div>` + commentsFor(p.id).map(c => `<div class="comment"><div class="comment-byline"><strong>${escape(c.name || t('guest'))}</strong><span>${t('yourComment')}</span></div><p>${escape(c.text).replace(/\n/g,'<br>')}</p></div>`).join('');
  }
  function renderProduct(id) {
    const p = products.find(item => item.id === id); if (!p) return;
    activeProduct = id;
    const saved = data.saved.includes(id), voted = data.votes.includes(id);
    $('#product-detail').innerHTML = `<div class="detail-top"><div class="detail-visual"><img src="assets/${p.image}" alt="${escape(content(p.name))}"></div><div class="detail-copy"><p class="eyebrow">${t(p.category)} / ${p.code}</p><h2 id="detail-title">${content(p.name)}</h2><p class="detail-description">${content(p.description)}</p><dl class="detail-facts"><div><dt>${t('material')}</dt><dd>${content(p.fabric)}</dd></div><div><dt>${t('colour')}</dt><dd>${content(p.colour)}</dd></div><div><dt>${t('fit')}</dt><dd>${content(p.fit)}</dd></div></dl><div class="detail-actions"><button class="button dark" data-save="${id}" aria-pressed="${saved}">${icon('bookmark',saved)}<span>${t(saved ? 'saved' : 'save')}</span></button><button class="button outline" data-vote="${id}" aria-pressed="${voted}">${icon('heart',voted)}<span>${t(voted ? 'voted' : 'vote')}</span></button></div><small>${t('detailNote')}</small></div></div><section class="discussion"><div class="discussion-head"><h3>${t('discussion')}</h3><small>${t('discussionNote')}</small></div><div id="comments-list">${renderComments(p)}</div><form class="comment-form" id="comment-form"><label for="comment-name">${t('nickname')}</label><input id="comment-name" name="nickname" maxlength="40" placeholder="${t('nicknamePlaceholder')}" autocomplete="off"><label for="comment-text">${t('commentLabel')}</label><textarea id="comment-text" name="comment" required maxlength="500" placeholder="${t('commentPlaceholder')}"></textarea><div class="comment-actions"><small>${t('commentPolicy')}</small><button class="button dark" type="submit">${t('post')} ↗</button></div></form></section>`;
    $('#product-dialog').setAttribute('aria-labelledby','detail-title');
  }
  function refreshDetailButtons() {
    if (!activeProduct) return;
    $$('#product-detail [data-save]').forEach(button => { const value = data.saved.includes(activeProduct); button.setAttribute('aria-pressed',value); button.innerHTML = icon('bookmark',value) + `<span>${t(value ? 'saved' : 'save')}</span>`; });
    $$('#product-detail [data-vote]').forEach(button => { const value = data.votes.includes(activeProduct); button.setAttribute('aria-pressed',value); button.innerHTML = icon('heart',value) + `<span>${t(value ? 'voted' : 'vote')}</span>`; });
  }
  function renderSaved() {
    const selected = products.filter(p => data.saved.includes(p.id));
    $('#saved-list').innerHTML = selected.length ? selected.map(p => `<div class="saved-item"><img src="assets/${p.image}" alt="${escape(content(p.name))}"><div><h3>${content(p.name)}</h3><p>${p.code} / ${content(p.colour)}</p><button data-remove="${p.id}">${t('remove')}</button></div></div>`).join('') : `<p class="empty">${t('emptySaved')}</p>`;
    $('#export-edit').disabled = !selected.length;
  }
  function renderPreferences() {
    $('#preferences').innerHTML = priorities.map(p => `<button type="button" data-preference="${p.id}" class="${preferences.includes(p.id) ? 'active' : ''}" aria-pressed="${preferences.includes(p.id)}">${p[language]}</button>`).join('');
    $('#preference-count').textContent = `${preferences.length} / 3 ${t('selected')}`;
  }
  function renderEmail() {
    $('#email-content').innerHTML = `<p class="eyebrow">${t('emailLabel')}</p><div class="email-meta">${t('emailSubject')}<br>${t('emailFrom')}</div><div class="email-brand">SOHO FASHION</div><h2 class="email-intro" id="email-title">${t('emailTitle')}</h2><p>${t('emailIntro')}</p><div class="email-products">${products.map(p => `<div><img src="assets/${p.image}" alt="${escape(content(p.name))}"><h3>${content(p.name)}</h3><p>${content(p.fabric)}</p></div>`).join('')}</div><a href="#collection" id="email-collection-link" class="button dark full">${t('emailCta')}</a><p class="email-meta">${t('emailFooter')}</p>`;
    $('#email-dialog').setAttribute('aria-labelledby','email-title');
  }
  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    $$('[data-t]').forEach(el => { el.innerHTML = t(el.dataset.t); });
    $$('[data-placeholder]').forEach(el => { el.placeholder = t(el.dataset.placeholder); el.setAttribute('aria-label',t(el.dataset.placeholder)); });
    $('#language').textContent = language === 'en' ? '中文' : 'EN';
    $('#language').setAttribute('aria-label',language === 'en' ? '切换为中文' : 'Switch to English');
    renderProducts(); renderPreferences(); renderSaved(); renderEmail();
    if (activeProduct) renderProduct(activeProduct);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button, a'); if (!button) return;
    if (button.hasAttribute('data-close')) button.closest('dialog').close();
    if (button.dataset.product) { renderProduct(button.dataset.product); openDialog('#product-dialog'); $('#product-dialog').scrollTop = 0; }
    if (button.dataset.save || button.dataset.remove) {
      const id = button.dataset.save || button.dataset.remove, wasSaved = data.saved.includes(id);
      data.saved = wasSaved ? data.saved.filter(item => item !== id) : [...data.saved,id];
      const ok = persist(); renderProducts(); renderSaved(); refreshDetailButtons();
      if (ok) toast(t(wasSaved ? 'removedToast' : 'savedToast'));
    }
    if (button.dataset.vote) {
      const id = button.dataset.vote, wasVoted = data.votes.includes(id);
      data.votes = wasVoted ? data.votes.filter(item => item !== id) : [...data.votes,id];
      const ok = persist(); renderProducts(); refreshDetailButtons();
      if (ok) toast(t(wasVoted ? 'unsavedToast' : 'voteToast'));
    }
    if (button.dataset.filter) {
      filter = button.dataset.filter;
      $$('[data-filter]').forEach(el => { const active = el.dataset.filter === filter; el.classList.toggle('active',active); el.setAttribute('aria-pressed',active); });
      renderProducts();
    }
    if (button.dataset.preference) {
      const id = button.dataset.preference;
      if (preferences.includes(id)) preferences = preferences.filter(item => item !== id);
      else if (preferences.length < 3) preferences.push(id);
      else { toast(t('maxPreferences')); return; }
      renderPreferences();
    }
    if (button.id === 'email-collection-link') $('#email-dialog').close();
  });
  $('#search').addEventListener('input',renderProducts);
  $('#sort').addEventListener('change',renderProducts);
  $('#clear-filters').addEventListener('click',() => { $('#search').value = ''; $('[data-filter="all"]').click(); });
  $('#language').addEventListener('click',() => { language = language === 'en' ? 'zh' : 'en'; data.language = language; persist(); applyLanguage(); });
  $('#saved-toggle').addEventListener('click',() => { renderSaved(); openDialog('#saved-dialog'); });
  $('#preview-info').addEventListener('click',() => openDialog('#info-dialog'));
  $('#about-button').addEventListener('click',() => openDialog('#info-dialog'));
  $('#email-preview').addEventListener('click',() => { renderEmail(); openDialog('#email-dialog'); });
  $('#save-preferences').addEventListener('click',() => { if (!preferences.length) { toast(t('selectPreference')); return; } data.preferences = [...preferences]; if (persist()) toast(t('savedPreferences')); });
  $('#subscribe-form').addEventListener('submit',event => { event.preventDefault(); $('#subscribe-status').textContent = t('subscribeSuccess'); });
  $('#product-detail').addEventListener('submit',event => {
    if (event.target.id !== 'comment-form') return;
    event.preventDefault(); const text = $('#comment-text').value.trim(), name = $('#comment-name').value.trim().slice(0,40);
    if (!text) { toast(t('commentEmpty')); return; }
    if (text.length > 500) { toast(t('minComments')); return; }
    const p = products.find(item => item.id === activeProduct);
    data.comments[activeProduct] = [...commentsFor(activeProduct),{name,text,date:new Date().toISOString()}].slice(-50);
    const ok = persist(); $('#comments-list').innerHTML = renderComments(p); $('#comment-text').value = '';
    if (ok) toast(t('commentToast'));
  });
  $('#export-edit').addEventListener('click',() => {
    const selected = products.filter(p => data.saved.includes(p.id)); if (!selected.length) return;
    const text = [t('exportTitle'),t('exportNote'),'',...selected.map(p => `${p.code} | ${content(p.name)} | ${content(p.fabric)} | ${content(p.colour)}`),'',`${location.origin}${location.pathname}#collection`].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'SOHO-My-City-Edit.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); toast(t('exportToast'));
  });
  $$('dialog').forEach(dialog => dialog.addEventListener('click',event => { if (event.target !== dialog) return; const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); }));
  $('#saved-dialog').setAttribute('aria-label','My saved pieces');
  $('#info-dialog').setAttribute('aria-label','About this concept preview');
  $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed',button.dataset.filter === filter));
  applyLanguage();
})();
