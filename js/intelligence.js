(() => {
  'use strict';
  const root = document.querySelector('main');
  const page = document.body.dataset.page;
  let data, topic = 'Overview', query = '';
  const e=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const a=(url,cls,text)=>{const n=e('a',cls,text);n.href=url;return n;};
  const url=(id,chapter='')=>`trend-story.html?story=${encodeURIComponent(id)}${chapter?'#'+chapter:''}`;
  function photo(asset,eager=false){const img=e('img');img.src=asset.src;img.alt=asset.alt;img.loading=eager?'eager':'lazy';img.decoding='async';return img;}
  function figure(id,eager=false){const asset=data.assets[id],f=e('figure','intel-figure'),cap=e('figcaption',null,asset.caption);cap.append(e('small',null,`${asset.publisher} · ${asset.season} · ${asset.role}`));f.append(photo(asset,eager),cap);return f;}
  function meta(left,right){const n=e('div','forecast-meta');n.append(e('span',null,left),e('span',null,right));return n;}
  function lead(){
    const primary=data.reports.find(r=>r.id==='quiet-architecture');
    const cover=a(url(primary.id),'lead-cover');cover.append(photo(data.assets[primary.visuals.cover],true),e('span','cover-image-note','IMAGE / A/W 2026 EDITORIAL'));
    const copy=e('div','lead-cover-copy');copy.append(e('span',null,'SILHOUETTE / A/W 27/28 FORECAST'),e('h2',null,primary.title),e('p',null,primary.subtitle),e('b',null,'↗'),e('p','source-line','IMAGE: LEMAIRE / A/W 2026 EDITORIAL'));cover.append(copy);
    const side=e('div','lead-companions');
    [['human-imprint','MATERIALS / A/W 27/28'],['pastoral-tension','PRINT & PATTERN / A/W 27/28']].forEach(([id,label])=>{const r=data.reports.find(x=>x.id===id),node=e('article','companion-story'),link=a(url(id));link.append(photo(data.assets[r.visuals.cover]));const body=e('div');body.append(e('span','intel-label',label),e('h3',null,r.title),e('p',null,r.subtitle));link.append(body);node.append(link);side.append(node);});
    document.getElementById('editorial-lead').replaceChildren(cover,side);
  }
  function reportCard(report){const asset=data.assets[report.visuals.cover],node=e('article','forecast-story'),link=a(url(report.id)),media=e('div','forecast-image'+(report.id==='quiet-architecture'?'':' is-material'));media.append(photo(asset));const h=e('h3',null,report.title);h.append(e('span',null,'↗'));link.append(media,meta('A/W 27/28 FORECAST','SOHO FASHION'),h,e('p',null,report.subtitle),e('p','source-line','IMAGE: '+asset.publisher+' / '+asset.season));node.append(link);return node;}
  function insightCard(item){const asset=data.assets[item.asset],node=e('article','forecast-story'),link=a(url(item.dossier,item.chapter)),media=e('div','forecast-image'+(item.topic==='Silhouette'?' is-portrait':'')+(item.topic==='Materials'||item.topic==='Print'||item.topic==='Colour'?' is-material':''));media.append(photo(asset));const h=e('h3',null,item.title);h.append(e('span',null,'↗'));link.append(media,meta(item.topic,asset.season),h,e('p',null,item.deck),e('p','source-line',asset.publisher+' / '+asset.role));node.append(link);return node;}
  function renderFeed(){
    const stories=topic==='Overview'&&!query?data.reports:data.insights.filter(x=>(topic==='Overview'||x.topic===topic)&&(!query||[x.title,x.deck,x.topic].join(' ').toLowerCase().includes(query.toLowerCase())));
    document.getElementById('forecast-grid').replaceChildren(...stories.map(x=>x.visuals?reportCard(x):insightCard(x)));
    document.getElementById('feed-title').textContent=query?'Search results':topic==='Overview'?'Seasonal directions':topic==='Print'?'Print & pattern':topic==='Materials'?'Material direction':topic==='Colour'?'Colour research':topic+' studies';
    document.getElementById('feed-overline').textContent='A/W 27/28 RESEARCH';
    document.getElementById('feed-note').textContent=topic==='Overview'&&!query?'Four reports across silhouette, textiles and pattern.':topic==='Colour'?'Published supplier colour research, with its original source.':'Fashion and textile references, with original source seasons.';
    document.getElementById('search-empty').hidden=stories.length>0;
    document.querySelectorAll('[data-topic]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.topic===topic)));
  }
  function refs(container,ids){const groups=new Map();for(const id of ids){const asset=data.assets[id];if(!asset)continue;if(!groups.has(asset.sourceUrl))groups.set(asset.sourceUrl,{asset,credits:new Set()});groups.get(asset.sourceUrl).credits.add(asset.credit);}for(const [sourceUrl,{asset,credits}] of groups){const row=e('div','reference-row'),link=a(sourceUrl,null,`${asset.publisher} / ${asset.season} ↗`);link.target='_blank';link.rel='noopener noreferrer';row.append(link);for(const credit of credits)row.append(e('p',null,credit));container.append(row);}}
  function setupHub(){lead();renderFeed();document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.topic;query='';renderFeed();document.getElementById('research-feed').scrollIntoView({behavior:'instant',block:'start'});}));const container=document.getElementById('hub-references');const research=e('div','reference-row');research.append(a('https://www.wgsnchina.cn/fashion',null,'WGSN / seasonal fashion research ↗'),e('p',null,'Research input for SOHO Fashion’s independent interpretation. No WGSN source images or original reports are reproduced here.'));container.append(research);refs(container,Object.keys(data.assets).filter(id=>id!=='GI01'));}
  function heading(label,title){const node=e('div');node.append(e('span','intel-label',label),e('h2',null,title));return node;}
  function chapter(id,title,text,ids){const section=e('section','dossier-chapter');section.id=id;section.dataset.chapter=id;const head=e('div','chapter-heading');head.append(heading(`0${['silhouette','elements','materials','print','colour'].indexOf(id)+1} / ${id.toUpperCase()}`,title),e('p',null,text));section.append(head);if(ids&&ids.length){const gallery=e('div','chapter-gallery'+(ids.length===1?' one-image':''));ids.forEach(imageId=>gallery.append(figure(imageId)));section.append(gallery);}return section;}
  function setupDossier(){
    const id=new URLSearchParams(location.search).get('story'),r=data.reports.find(x=>x.id===id),article=document.getElementById('dossier');
    if(!r){article.replaceChildren(e('h1',null,'Explore the current forecast edit'),a('trend.html#intelligence','intel-link','Return to Trend Intelligence ↗'));return;}
    document.title=`${r.title} | A/W 27/28 · SOHO Fashion`;
    const head=e('header','dossier-head');head.append(e('span','intel-label',`${r.directionLabel} / GLOBAL DIRECTIONS ${r.number}`),e('h1',null,r.title),e('p',null,r.subtitle),e('small',null,'SOHO FASHION / WOMEN & MEN / NOVEMBER 2026'));
    const opener=e('div','dossier-opener');opener.append(figure(r.visuals.cover,true),e('div','dossier-thesis',r.thesis));
    const nav=e('nav','chapter-nav');nav.setAttribute('aria-label','Report chapters');['Silhouette','Elements','Materials','Print','Colour'].forEach(name=>nav.append(a('#'+name.toLowerCase(),null,name)));
    const silhouette=chapter('silhouette','The silhouette',r.silhouette,r.visuals.silhouette);
    const elements=chapter('elements','The design language',r.designElements,r.visuals.elements);const words=e('div','element-keywords');r.elementKeywords.forEach(word=>words.append(e('span',null,word)));elements.insertBefore(words,elements.children[1]||null);
    const materials=chapter('materials','Material expression',r.textilesAndPattern,r.visuals.materials);
    const printText=id==='pastoral-tension'?'Archival flowers move between recognisable ornament and abstraction. Scale, blur and digital fragmentation change the reading of a familiar motif.':id==='human-imprint'?'Altered botanical imagery introduces memory and expressive marks. The pictured print study explores enlargement and pixelation; it sits beside the season’s wider interest in painterly surfaces.':'Pattern takes a quieter role. Near-plains, subtle woven structure and restrained tonal relationships keep the silhouette and surface in focus.';
    const print=chapter('print','Print & pattern',printText,['pastoral-tension','human-imprint'].includes(id)?['GI06']:[]);
    const colour=chapter('colour','Colour relationships',r.colourDirection,[]),families=e('div','colour-families');r.colourFamilies.forEach(name=>families.append(e('span',null,name)));colour.append(families,e('p','colour-note','Descriptive colour families from SOHO Fashion’s reading of seasonal research. These are not an official WGSN, Coloro or Pantone palette. For a published supplier study, see the Colour research section on the trend homepage.'));
    const observation=e('aside','observed-note');observation.append(e('span',null,r.observedSignal.label),e('p',null,r.observedSignal.text));
    const sources=e('details','dossier-references'),summary=e('summary',null,'Images & references');summary.append(e('span',null,'+'));sources.append(summary);const sourceBody=e('div');refs(sourceBody,[...new Set([r.visuals.cover,...Object.values(r.visuals).filter(Array.isArray).flat()])]);sources.append(sourceBody);
    article.replaceChildren(head,opener,nav,silhouette,elements,materials,print,colour,observation,sources);
    document.getElementById('continue-grid').replaceChildren(...data.reports.filter(x=>x.id!==id).map(item=>{const n=e('article'),link=a(url(item.id));link.append(photo(data.assets[item.visuals.cover]),e('h3',null,item.title));n.append(link);return n;}));
    if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target)target.scrollIntoView();}
  }
  function shared(){
    const form=document.querySelector('.header-search');if(form)form.addEventListener('submit',event=>{event.preventDefault();const value=form.querySelector('input').value.trim();if(page==='hub'){query=value;topic='Overview';renderFeed();document.getElementById('research-feed').scrollIntoView();}else location.href='trend.html?q='+encodeURIComponent(value)+'#research-feed';});
    const selection=document.querySelector('[aria-label="View selection"]');if(selection)selection.addEventListener('click',()=>location.href='https://liyalili10805-png.github.io/marks-client-showroom/my-selection.html');
    const contact=document.querySelector('[aria-label="Subscribe"]');if(contact){contact.setAttribute('aria-label','Contact SOHO Fashion');contact.addEventListener('click',()=>location.href='mailto:online@saintycorp.com');}
  }
  fetch('data/intelligence.json?v=20261115live4').then(response=>{if(!response.ok)throw new Error('Unavailable');return response.json();}).then(value=>{data=value;query=new URLSearchParams(location.search).get('q')||'';shared();if(page==='hub')setupHub();else setupDossier();}).catch(()=>{const message=e('div','intel-loading','This report could not load. Please refresh the page.');(document.getElementById(page==='hub'?'editorial-lead':'dossier')||root).replaceChildren(message);});
})();
