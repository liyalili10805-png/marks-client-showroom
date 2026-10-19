const ASSET_ROOT = 'https://file.style3d.com/website/Company/b8d4aa61-626f-4d7c-9edc-501b61112de9/';
const pages = {
  trend: { title: 'TREND', intro: 'SOHO-Marks · current edit', type: 'trend' },
  products: { title: 'PRODUCTS', intro: 'Select a category', type: 'products' },
  mens: { title: 'MENS', intro: 'Mens collection', type: 'mens' },
  womens: { title: 'WOMENS', intro: 'Womens collection', type: 'womens' },
  about: { title: 'ABOUT US', intro: 'SOHO · Marks', type: 'about' }
};
const trendItems = [
  { id:'trend-shacket', name:'SHACKET', image:ASSET_ROOT+'displayhall/image_20260403185102_8863_shacket/shacket.png', detail:ASSET_ROOT+'business/dashboard/20260403190945_3402_1775214585984PDF/1775214585984PDF.png' },
  { id:'trend-shirt', name:'SHIRT', image:ASSET_ROOT+'displayhall/image_20260403195851_7200_shirt/shirt.png', detail:ASSET_ROOT+'business/dashboard/20260403195912_3524_1775217552495PDF/1775217552495PDF.png' },
  { id:'trend-jacket', name:'JACKET', image:ASSET_ROOT+'displayhall/image_20260403184950_7582_jacket/jacket.png', detail:ASSET_ROOT+'business/dashboard/20260403185509_8111_1775213709122PDF/1775213709122PDF.png' },
  { id:'trend-coat', name:'COAT', image:ASSET_ROOT+'displayhall/image_20260403192209_8894_coat/coat.png', detail:ASSET_ROOT+'business/dashboard/20260403192303_3759_1775215383666PDF/1775215383666PDF.png' },
  { id:'trend-trouser', name:'TROUSER', image:ASSET_ROOT+'displayhall/image_20260403211358_3038_trouser/trouser.png', detail:ASSET_ROOT+'business/dashboard/20260403211424_1883_1775222064974PDF/1775222064974PDF.png' },
  { id:'trend-fabric', name:'FABRIC', image:ASSET_ROOT+'displayhall/image_20260403194032_2493_D6DE74A747357928EAFB3C53127595FD/D6DE74A747357928EAFB3C53127595FD.png', detail:ASSET_ROOT+'business/dashboard/20260403210903_7307_1775221743074PDF/1775221743074PDF.png' }
];
const mensImages = [
  'displayhall/image_20260403184731_6656_1775213251456Thumb/1775213251456Thumb.png',
  'displayhall/image_20260403152746_8902_E51547FD79A05160DAD09FA6B316A498/E51547FD79A05160DAD09FA6B316A498.jpg',
  'displayhall/image_20260403143212_4563_1775197932052Thumb/1775197932052Thumb.png',
  'displayhall/image_20260403143228_4284_1775197948010Thumb/1775197948010Thumb.png',
  'displayhall/image_20260403143200_8706_1775197920686Thumb/1775197920686Thumb.png',
  'displayhall/image_20260403152938_6063_1775201378312Thumb/1775201378312Thumb.png',
  'displayhall/image_20260403164925_3099_1775206165497Thumb/1775206165497Thumb.png',
  'displayhall/image_20260403152852_1188_1775201332783Thumb/1775201332783Thumb.png',
  'displayhall/image_20260403152951_2598_1775201391592Thumb/1775201391592Thumb.png'
];
const womensImages = [
  'displayhall/image_20260403170957_2429_DA858E6F988AD6C7BB0FC4F9D2433F92/DA858E6F988AD6C7BB0FC4F9D2433F92.jpg',
  'displayhall/image_20260403161907_1745_1775204347441Thumb/1775204347441Thumb.png',
  'displayhall/image_20260403161654_5131_20260403075843-2b5483cb-4a1c93a6/20260403075843-2b5483cb-4a1c93a6.jpg',
  'displayhall/image_20260403161919_8204_1775204359576Thumb/1775204359576Thumb.png',
  'displayhall/image_20260403161941_8486_1775204381950Thumb/1775204381950Thumb.png',
  'displayhall/image_20260403161713_5720_20260403080558-6adda911-94e1baf6/20260403080558-6adda911-94e1baf6.jpg',
  'displayhall/image_20260403161932_5537_1775204372674Thumb/1775204372674Thumb.png',
  'displayhall/image_20260403162003_4129_1775204403048Thumb/1775204403048Thumb.png',
  'displayhall/image_20260403161733_4531_20260403080049-f338555c-8e985bd1/20260403080049-f338555c-8e985bd1.jpg'
];
const aboutImages = [
  'displayhall/image_20260108175201_3497_%E5%9B%9B%E6%8A%98%E9%A1%B52-%E5%8D%95%E9%A1%B5%E5%B0%BA%E5%AF%B819cm%C3%9728cm-%E5%B1%95%E5%BC%80%E5%B0%BA%E5%AF%B876cm%C3%9728cm-01/%E5%9B%9B%E6%8A%98%E9%A1%B52-%E5%8D%95%E9%A1%B5%E5%B0%BA%E5%AF%B819cm%C3%9728cm-%E5%B1%95%E5%BC%80%E5%B0%BA%E5%AF%B876cm%C3%9728cm-01.jpg',
  'displayhall/image_20260108175247_1813_%E5%9B%9B%E6%8A%98%E9%A1%B52-%E5%8D%95%E9%A1%B5%E5%B0%BA%E5%AF%B819cm%C3%9728cm-%E5%B1%95%E5%BC%80%E5%B0%BA%E5%AF%B876cm%C3%9728cm-02/%E5%9B%9B%E6%8A%98%E9%A1%B52-%E5%8D%95%E9%A1%B5%E5%B0%BA%E5%AF%B819cm%C3%9728cm-%E5%BC%80%E5%B1%95%E5%B0%BA%E5%AF%B876cm%C3%9728cm-02.jpg'
];
const store = { get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }, set(key, value) { localStorage.setItem(key, JSON.stringify(value)); } };
let selected = store.get('marks-shortlist', []);
let comments = store.get('marks-comments', {});
const root = document.getElementById('page-root');
const count = document.getElementById('shortlist-count');
function image(url, alt='') { const el = document.createElement('img'); el.src = url; el.alt = alt; el.loading = 'lazy'; el.onerror = () => { el.style.visibility = 'hidden'; }; return el; }
function itemFromImage(url, index, category) { return { id:`${category}-${index}`, name:`${category} ${String(index+1).padStart(2,'0')}`, image:ASSET_ROOT+url }; }
function isSaved(id) { return selected.some(x => x.id === id); }
function toggleSave(item) { selected = isSaved(item.id) ? selected.filter(x => x.id !== item.id) : [...selected, item]; store.set('marks-shortlist', selected); updateCount(); renderShortlist(); renderPage(location.hash.slice(1) || 'trend'); }
function updateCount() { count.textContent = selected.length; count.style.display = selected.length ? 'block' : 'none'; }
function resourceCard(item) { const card=document.createElement('article'); card.className='resource-card'; card.append(image(item.image,item.name)); const meta=document.createElement('div'); meta.className='resource-meta'; const name=document.createElement('span'); name.className='resource-name'; name.textContent=item.name; const actions=document.createElement('div'); actions.className='resource-actions'; const save=document.createElement('button'); save.className=`mini-action ${isSaved(item.id)?'saved':''}`; save.textContent=isSaved(item.id)?'已选':'选款'; save.onclick=e=>{e.stopPropagation();toggleSave(item);}; const view=document.createElement('button'); view.className='mini-action'; view.textContent='查看'; view.onclick=()=>openDetail(item); actions.append(save,view); meta.append(name,actions); card.append(meta); card.onclick=e=>{if(e.target.tagName!=='BUTTON')openDetail(item);}; return card; }
function renderTrend() { const wrap=document.createElement('div'); const video=document.createElement('div'); video.className='module'; const v=document.createElement('video'); v.controls=true; v.muted=true; v.preload='metadata'; v.poster=trendItems[0].image; const source=document.createElement('source'); source.src=ASSET_ROOT+'displayhall/video_20260407184745_6386_4%E6%9C%883%E6%97%A5/4%E6%9C%883%E6%97%A5.mp4'; source.type='video/mp4'; v.append(source); video.append(v); wrap.append(video); const grid=document.createElement('div'); grid.className='trend-grid'; trendItems.forEach(item=>{const figure=document.createElement('figure');figure.className='trend-card';figure.append(image(item.image,item.name));const cap=document.createElement('figcaption');cap.textContent=item.name;figure.append(cap);figure.onclick=()=>openDetail(item);grid.append(figure);});wrap.append(grid);return wrap; }
function renderProducts() { const wrap=document.createElement('div'); wrap.innerHTML='<div class="module-grid two"><a class="module category-tile" href="#mens"><div class="caption-bar"><span>MENS</span><span>VIEW COLLECTION</span></div></a><a class="module category-tile" href="#womens"><div class="caption-bar"><span>WOMENS</span><span>VIEW COLLECTION</span></div></a></div>'; const tiles=wrap.querySelectorAll('.category-tile'); tiles[0].prepend(image(ASSET_ROOT+mensImages[0],'MENS')); tiles[1].prepend(image(ASSET_ROOT+womensImages[0],'WOMENS')); return wrap; }
function renderCollection(list, category) { const wrap=document.createElement('div'); const grid=document.createElement('div'); grid.className='module-grid'; list.forEach((url,i)=>grid.append(resourceCard(itemFromImage(url,i,category)))); wrap.append(grid); return wrap; }
function renderAbout() { const wrap=document.createElement('div'); const copy=document.createElement('div'); copy.className='about-copy'; copy.innerHTML='<p class="eyebrow">SOHO / MARKS</p><h2>展厅资料</h2><p>这里保留原始展厅的 ABOUT US 页面，用于查看品牌与系列资料。后续素材可直接替换，不需要改变页面结构。</p>'; wrap.append(copy); const grid=document.createElement('div'); grid.className='module-grid two'; aboutImages.forEach((url,i)=>{const m=document.createElement('div');m.className='module';m.append(image(ASSET_ROOT+url,`ABOUT ${i+1}`));grid.append(m);});wrap.append(grid);return wrap; }
function renderPage(key) { key=pages[key]?key:'trend'; const cfg=pages[key]; root.innerHTML=''; const title=document.createElement('div'); title.className='page-title'; title.innerHTML=`<h1>${cfg.title}</h1><p>${cfg.intro}</p>`; root.append(title); if(cfg.type==='trend')root.append(renderTrend()); if(cfg.type==='products')root.append(renderProducts()); if(cfg.type==='mens')root.append(renderCollection(mensImages,'MENS')); if(cfg.type==='womens')root.append(renderCollection(womensImages,'WOMENS')); if(cfg.type==='about')root.append(renderAbout()); document.querySelectorAll('[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===key)); }
function openDetail(item) { const modal=document.getElementById('detail-modal'); const content=document.getElementById('detail-content'); const list=comments[item.id]||[]; content.innerHTML=''; const layout=document.createElement('div'); layout.className='detail-layout'; layout.append(image(item.detail||item.image,item.name)); const info=document.createElement('div'); info.className='detail-info'; info.innerHTML=`<p class="eyebrow">STYLE3D SHOWROOM</p><h2 id="detail-title">${item.name}</h2><p>保留原展厅的款式展示方式。可在这里记录门店或客户对该款的意见，供后续选款参考。</p>`; const buttons=document.createElement('div'); buttons.className='detail-buttons'; const save=document.createElement('button'); save.className='outline-button'; save.textContent=isSaved(item.id)?'已加入选款单':'加入选款单'; save.onclick=()=>toggleSave(item); const comment=document.createElement('button'); comment.className='solid-button'; comment.textContent='写意见'; comment.onclick=()=>document.getElementById('comment-box').focus(); buttons.append(save,comment); info.append(buttons); layout.append(info); content.append(layout); const commentsBox=document.createElement('div'); commentsBox.className='comment-list'; commentsBox.innerHTML='<p class="eyebrow">COMMENTS</p>'; list.forEach(c=>{const row=document.createElement('div');row.className='comment';row.textContent=c.text;const time=document.createElement('small');time.textContent=c.time;row.append(time);commentsBox.append(row);}); const form=document.createElement('form'); form.className='comment-form'; form.innerHTML='<textarea id="comment-box" placeholder="写下这款在门店查看后的意见"></textarea><button class="outline-button" type="submit">提交意见</button>'; form.onsubmit=e=>{e.preventDefault();const text=form.querySelector('textarea').value.trim();if(!text)return;comments[item.id]=[...(comments[item.id]||[]),{text,time:new Date().toLocaleString('zh-CN')}];store.set('marks-comments',comments);openDetail(item);}; commentsBox.append(form); content.append(commentsBox); modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
function renderShortlist() { const box=document.getElementById('shortlist-items'); box.innerHTML=''; if(!selected.length){box.innerHTML='<p class="muted">还没有加入选款单。</p>';return;} selected.forEach(item=>{const row=document.createElement('div');row.className='shortlist-row';row.append(image(item.image,item.name));const text=document.createElement('div');text.innerHTML=`<strong>${item.name}</strong><small>已选款式</small>`;const remove=document.createElement('button');remove.className='mini-action';remove.textContent='移除';remove.onclick=()=>toggleSave(item);row.append(text,remove);box.append(row);}); }
function openPanel(){document.getElementById('shortlist-panel').classList.add('open');document.getElementById('shortlist-panel').setAttribute('aria-hidden','false');renderShortlist();}
function closeAll(){document.querySelectorAll('.modal.open,.side-panel.open').forEach(el=>{el.classList.remove('open');el.setAttribute('aria-hidden','true');});}
window.addEventListener('hashchange',()=>renderPage(location.hash.slice(1)||'trend'));
document.getElementById('open-shortlist').onclick=openPanel;
document.getElementById('open-subscribe').onclick=()=>document.getElementById('subscribe-modal').classList.add('open');
document.querySelectorAll('[data-close-panel],[data-close-modal]').forEach(btn=>btn.onclick=closeAll);
document.getElementById('download-shortlist').onclick=()=>{const text=selected.map((x,i)=>`${i+1}. ${x.name}\n${x.image}`).join('\n');const blob=new Blob([`SOHO-Marks 选款单\n\n${text}`],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SOHO-Marks-选款单.txt';a.click();URL.revokeObjectURL(a.href);};
document.getElementById('subscribe-form').onsubmit=e=>{e.preventDefault();const email=document.getElementById('subscribe-email').value;document.getElementById('subscribe-status').textContent=`已记录 ${email}，后续可接入实际周报发送。`;};
updateCount(); renderShortlist(); renderPage(location.hash.slice(1)||'trend');
