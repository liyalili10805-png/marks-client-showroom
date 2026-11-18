/* One material identity from cloth library to style, shortlist and review export. */
(() => {
  'use strict';
  const version=new URL(document.currentScript.src,location.href).searchParams.get('v')||'20261118matches1';
  const PAIR_KEY='soho-style-material-pairs-v1';
  let pending;
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v==null?fallback:v;}catch{return fallback;}};
  function materialUrl(material){const p=new URLSearchParams({material:material.id,colourway:material.colourwayImage});if(material.styleId)p.set('style',material.styleId);return 'products.html?'+p;}
  async function load(products){
    if(!pending)pending=Promise.all(['data/style-material-matches.json','data/materials-library.json'].map(url=>fetch(url+'?v='+encodeURIComponent(version)).then(r=>{if(!r.ok)throw Error('Material links unavailable');return r.json();})));
    let matching,library;
    try{[matching,library]=await pending;if(!matching.styles||!Array.isArray(library.items))throw Error('Invalid material links');}
    catch{products.forEach(p=>{p.materialMatchesError=true;p.recordedMaterial=p.code.startsWith('RF27-')?p.materials?.[0]:null;p.materials=[];});return;}
    const byId=new Map(library.items.map(m=>[m.id,m]));
    products.forEach(product=>{
      if(product.materialMatchesReady)return;
      product.recordedMaterial=product.code.startsWith('RF27-')?product.materials?.[0]:null;
      const match=matching.styles[product.code];
      product.materialMatchBrief=match?.brief||'';product.materialMatchChecks=match?.checks||'';
      product.materials=(match?.pairs||[]).flatMap(pair=>{
        const item=byId.get(pair.materialId);
        if(!item||item.sourceType==='studio'||!item.image)return [];
        const choice=(item.colorways||[]).find(c=>c.image===pair.colourwayImage);
        // Missing or foreign colourway must never silently become a different cloth.
        if(pair.colourwayImage!==item.image&&!choice)return [];
        return [{id:item.id,styleId:product.code,name:item.title,library:true,role:pair.role,reason:pair.reason,review:pair.review,
          colourway:choice?.name||(item.colors||[]).join(' / '),colourwayImage:pair.colourwayImage,
          preview:choice?.displayThumbnail||choice?.thumbnail||item.displayThumbnail||item.thumbnail,
          structure:item.structure||item.family,composition:item.composition||'Not supplied in the library record',
          hand:'Physical-sample review required',weight:item.weight||'Not supplied in the library record',
          care:item.care||'To be confirmed by cloth testing',status:'Library reference · sampling required',
          referenceStatus:item.status,research:Array.isArray(pair.research)?pair.research:[]}];
      });
      product.materialMatchesReady=true;
    });
  }
  function selected(product){
    const saved=read(PAIR_KEY,{}),choice=saved&&saved[product.code];
    if(!choice)return null;
    return product.materials.find(m=>m.library&&m.id===choice.materialId&&m.colourwayImage===choice.colourwayImage)||null;
  }
  function save(product,material){
    if(!material?.library||!product.materials.includes(material))throw Error('Invalid style/material combination');
    const stored=read(PAIR_KEY,{}),map=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
    map[product.code]={styleId:product.code,materialId:material.id,colourwayImage:material.colourwayImage,colourway:material.colourway,role:material.role,status:'Requested development combination · physical approval required'};
    localStorage.setItem(PAIR_KEY,JSON.stringify(map));
    return map[product.code];
  }
  function record(product){const material=selected(product);return material?{styleId:product.code,materialId:material.id,colourway:material.colourway,colourwayImage:material.colourwayImage,role:material.role,reason:material.reason,review:material.review,url:materialUrl(material),status:'Requested development combination · physical approval required'}:null;}
  window.StyleMaterials={load,selected,save,record,url:materialUrl};
})();
