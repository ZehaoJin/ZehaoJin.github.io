(function () {
  'use strict';
  const source = document.getElementById('research-data');
  if (!source || !window.ResearchModel) return;
  const data = JSON.parse(source.textContent);
  const model = window.ResearchModel;
  const vocabulary = [...data.scales, ...data.approaches, ...data.roles];
  const labels = new Map(vocabulary.map(t => [t.id, t.label]));
  const papersById = new Map(data.papers.map(p => [p.id, p]));
  const tagNames = paper => model.tags(paper).map(id => labels.get(id));
  const html = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  function initFilters() {
    const root = document.getElementById('research-publications');
    if (!root) return;
    const controls = root.querySelector('#publication-filters');
    const selected = new Set();
    const buttons = [...root.querySelectorAll('[data-filter]')];
    const items = [...root.querySelectorAll('li[data-paper]')];
    const categories = [...root.querySelectorAll('.publication-category')];
    const count = root.querySelector('#publication-count');
    function readURL() {
      selected.clear();
      (new URL(location.href).searchParams.get('tags') || '').split(',').forEach(tag => {
        if (labels.has(tag)) selected.add(tag);
      });
    }
    function update(writeURL) {
      let shown = 0, published = 0;
      for (const li of items) {
        const paper = papersById.get(li.dataset.paper);
        const show = model.matches(paper, selected);
        li.hidden = !show;
        if (show) {shown++; if (paper.status === 'published') published++;}
      }
      buttons.forEach(button => button.setAttribute('aria-pressed', String(selected.has(button.dataset.filter))));
      categories.forEach(category => {category.hidden = ![...category.querySelectorAll('li[data-paper]')].some(li => !li.hidden);});
      count.textContent = `Showing ${shown} of ${items.length} papers (${published} published${shown > published ? `, ${shown - published} submitted` : ''}).` +
        (selected.size ? ` Matching: ${[...selected].map(id => labels.get(id)).join(' + ')}.` : ' All papers shown.');
      root.querySelector('#no-publications').hidden = shown !== 0;
      root.querySelector('#clear-filters').disabled = selected.size === 0;
      if (writeURL) {
        const url = new URL(location.href);
        if (selected.size) url.searchParams.set('tags', [...selected].join(','));
        else url.searchParams.delete('tags');
        history.replaceState(null, '', url);
      }
    }
    buttons.forEach(button => {
      button.disabled = false;
      button.addEventListener('click', () => {
        const tag = button.dataset.filter;
        selected.has(tag) ? selected.delete(tag) : selected.add(tag);
        update(true);
      });
    });
    root.querySelector('#clear-filters').addEventListener('click', () => {selected.clear(); update(true);});
    window.addEventListener('popstate', () => {readURL(); update(false);});
    readURL(); update(false); controls.hidden = false;
  }

  function initMap() {
    const container = document.getElementById('research-map');
    if (!container) return;
    const stats = model.statistics(data);
    const ns = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs = {}, text) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      if (text !== undefined) el.textContent = text;
      return el;
    };
    const x0=380, y0=224, cw=128, rh=76, right=x0+data.scales.length*cw;
    const mapBottom=y0+data.approaches.length*rh;
    const svg = svgEl('svg', {viewBox:`0 0 1050 ${mapBottom+50}`, role:'group', 'aria-labelledby':'map-title map-desc'});
    svg.append(svgEl('title', {id:'map-title'}, 'Research across scales and approaches'));
    svg.append(svgEl('desc', {id:'map-desc'}, `${stats.total} published papers. Columns show scientific scales; rows show approaches. Each star links to a paper. Repeated stars represent the same paper. Percentages use all ${stats.total} published papers. Cosmology has no papers yet.`));
    const approachLabelX=188, approachBarX=214, approachBarWidth=140;
    const metric = item => `${item.count} · ${item.percent}%`;
    const addText = (text,x,y,cls='atlas-label',anchor='start') => {
      const el=svgEl('text',{x,y,class:cls,'text-anchor':anchor},text); svg.append(el); return el;
    };
    addText(`n · % of ${stats.total} published papers`,right,24,'atlas-label','end');
    addText('APPROACH',approachLabelX,212,'atlas-axis-title','end');
    addText('(counts for overlaps)',approachLabelX+14,212,'atlas-overlap-note');
    addText('SCALE',x0,212,'atlas-axis-title');
    const defs=svgEl('defs');
    const arrow=svgEl('marker',{id:'scale-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'});
    arrow.append(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:'#314b62'}));
    defs.append(arrow); svg.append(defs);
    svg.append(svgEl('line',{x1:x0,y1:187,x2:right+16,y2:187,class:'atlas-scale-axis','marker-end':'url(#scale-arrow)'}));
    stats.scales.forEach((scale,i) => {
      const x=x0+i*cw, center=x+cw/2, barHeight=scale.count/stats.total*105;
      svg.append(svgEl('line',{x1:x+20,y1:130,x2:x+cw-20,y2:130,stroke:'#cbd8e3'}));
      svg.append(svgEl('rect',{x:center-24,y:130-barHeight,width:48,height:barHeight,rx:3,class:'atlas-bar','data-scale-count':scale.id}));
      addText(metric(scale),center,120-barHeight,'atlas-bar-value','middle');
      const label=addText('',center,151,'atlas-label','middle');
      if (scale.label.length>14) {
        const words=scale.label.split(' '), last=words.pop();
        label.append(svgEl('tspan',{x:center,dy:-2},words.join(' ')));
        label.append(svgEl('tspan',{x:center,dy:21},last));
      } else label.textContent=scale.label;
      svg.append(svgEl('line',{x1:center,y1:181,x2:center,y2:193,class:'atlas-scale-axis'}));
    });
    stats.approaches.forEach((approach,j) => {
      const y=y0+j*rh;
      const label=addText('',approachLabelX,y+rh/2+6,'atlas-label','end');
      const words=approach.label.split(' ');
      if (approach.label.length>20) {
        label.append(svgEl('tspan',{x:approachLabelX,dy:-11},words[0]));
        label.append(svgEl('tspan',{x:approachLabelX,dy:22},words.slice(1).join(' ')));
      } else label.textContent=approach.label;
      svg.append(svgEl('line',{x1:approachBarX,y1:y+rh/2,x2:approachBarX+approachBarWidth,y2:y+rh/2,stroke:'#dce5ec'}));
      svg.append(svgEl('rect',{x:approachBarX,y:y+rh/2-10,width:approach.count/stats.total*approachBarWidth,height:20,rx:3,class:'atlas-bar','data-approach-count':approach.id}));
      addText(metric(approach),approachBarX,y+rh/2-17,'atlas-bar-value');
    });
    for (const cell of stats.cells) {
      const i=data.scales.findIndex(s=>s.id===cell.scale), j=data.approaches.findIndex(a=>a.id===cell.approach);
      const x=x0+i*cw, y=y0+j*rh;
      const rect=svgEl('rect',{x,y,width:cw,height:rh,class:'atlas-grid'});
      rect.append(svgEl('title',{},`${labels.get(cell.scale)}, ${labels.get(cell.approach)}: ${cell.count} papers, ${cell.percent}%`));
      svg.append(rect);
      addText(metric(cell),x+cw-9,y+18,'atlas-cell-count','end');
    }
    const connections=svgEl('g',{'aria-hidden':'true'}), stars=svgEl('g');
    svg.append(connections,stars);
    const occurrences=[];
    for (const cell of stats.cells) {
      const i=data.scales.findIndex(s=>s.id===cell.scale), j=data.approaches.findIndex(a=>a.id===cell.approach);
      cell.papers.forEach((paper,k) => {
        const row=Math.floor(k/5), column=k%5, columns=Math.min(5,cell.papers.length-row*5);
        const x=x0+i*cw+cw/2+(column-(columns-1)/2)*23, y=y0+j*rh+35+row*23;
        const a=svgEl('a',{href:paper.url,target:'_blank',rel:'noopener noreferrer',tabindex:0,class:'atlas-star',
          'data-paper':paper.id,'data-highlighted':paper.roles.includes('highlighted'),
          'aria-label':`${paper.title}. ${paper.year}. ${paper.venue}. ${tagNames(paper).join(', ')}. Open paper in a new tab.`});
        a.append(svgEl('circle',{cx:x,cy:y,r:11,class:'star-hit'}));
        a.append(svgEl('path',{d:`M ${x} ${y-7} L ${x+2} ${y-2} L ${x+7} ${y} L ${x+2} ${y+2} L ${x} ${y+7} L ${x-2} ${y+2} L ${x-7} ${y} L ${x-2} ${y-2} Z`,class:'star-core'}));
        stars.append(a); occurrences.push({paper,x,y,el:a});
      });
    }
    addText('Cosmology: an open sky, for now.',x0+3*cw+cw/2,mapBottom+30,'atlas-cell-count','middle');
    container.append(svg);
    document.getElementById('atlas-total').textContent=`${stats.total} published papers · ${occurrences.length} stars`;
    const detail=document.getElementById('paper-detail');
    const tooltip=html('div','atlas-tooltip'); tooltip.id='atlas-tooltip'; tooltip.role='tooltip'; tooltip.hidden=true; document.body.append(tooltip);
    let activeId=null, touchId=null;
    function showDetail(paper) {
      detail.replaceChildren(html('h3','',paper.title),html('p','',`${paper.year} · ${paper.venue}`));
      const tags=html('div','paper-tags');
      tagNames(paper).forEach(label=>tags.append(html('span','research-tag',label)));
      const link=html('a','detail-read','Read this paper ↗'); link.href=paper.url; link.target='_blank'; link.rel='noopener noreferrer';
      detail.append(tags,link);
    }
    function highlight(id) {
      activeId=id; connections.replaceChildren();
      occurrences.forEach(o=>{o.el.classList.toggle('is-active',o.paper.id===id);o.el.classList.toggle('is-muted',!!id&&o.paper.id!==id);});
      if (!id) return;
      const points=occurrences.filter(o=>o.paper.id===id).map(o=>`${o.x},${o.y}`).join(' ');
      connections.append(svgEl('polyline',{points,class:'atlas-connection'}));
      showDetail(papersById.get(id));
    }
    function positionTooltip(x,y) {
      const width=tooltip.offsetWidth, height=tooltip.offsetHeight;
      tooltip.style.left=`${Math.max(12,Math.min(x+16,window.innerWidth-width-12))}px`;
      tooltip.style.top=`${Math.max(12,y+height+20>window.innerHeight?y-height-14:y+18)}px`;
    }
    function showTooltip(paper,x,y) {
      tooltip.replaceChildren(html('strong','',paper.title),html('span','',`${paper.year} · ${paper.venue}`),html('span','tooltip-tags',tagNames(paper).join(' · ')));
      tooltip.hidden=false; positionTooltip(x,y);
    }
    occurrences.forEach(({paper,el}) => {
      el.addEventListener('pointerenter',event=>{
        if (event.pointerType==='touch') return;
        highlight(paper.id); showTooltip(paper,event.clientX,event.clientY);
      });
      el.addEventListener('pointermove',event=>{if (!tooltip.hidden) positionTooltip(event.clientX,event.clientY);});
      el.addEventListener('pointerleave',()=>{tooltip.hidden=true;});
      el.addEventListener('focus',()=>{
        highlight(paper.id);
        const box=el.getBoundingClientRect(); showTooltip(paper,box.left,box.bottom);
      });
      el.addEventListener('blur',()=>{tooltip.hidden=true;});
      el.addEventListener('pointerdown',event=>{
        if (event.pointerType==='touch' && touchId!==paper.id) {
          el.dataset.firstTouch='true'; touchId=paper.id; highlight(paper.id); tooltip.hidden=true;
        }
      });
      el.addEventListener('click',event=>{
        if (el.dataset.firstTouch==='true') {event.preventDefault();delete el.dataset.firstTouch;}
      });
    });
    container.addEventListener('pointerleave',()=>{tooltip.hidden=true;if (!touchId&&!container.contains(document.activeElement)) highlight(null);});
    container.addEventListener('focusout',event=>{if(!container.contains(event.relatedTarget)) {tooltip.hidden=true;if(!touchId) highlight(null);}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){tooltip.hidden=true;touchId=null;highlight(null);}});
    window.addEventListener('scroll',()=>{tooltip.hidden=true;},true);
    window.addEventListener('resize',()=>{tooltip.hidden=true;});
  }
  initFilters();
  initMap();
})();
