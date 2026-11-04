(function () {
  'use strict';
  const container=document.getElementById('collaboration-map');
  if (!container) return;
  const data=JSON.parse(document.getElementById('research-data').textContent);
  const graph=window.ResearchModel.collaborations(data);
  const d3=window.d3;
  const SELF='zehao-jin', width=1050, height=790;
  const select=document.getElementById('collaborator-select');
  const detail=document.getElementById('collaboration-detail');
  const summary=document.getElementById('collaboration-summary');
  const hoverInfo=document.getElementById('collaboration-hover');
  const clear=document.getElementById('collaboration-clear');
  const overview=`${graph.nodes.length-1} collaborators · ${graph.total} published papers · ${graph.institutions.length} institutions`;
  summary.textContent=overview;
  const displayName=n=>n.chineseName?`${n.name} (${n.chineseName})`:n.name;
  const byId=new Map(graph.nodes.map(n=>[n.id,n]));
  const make=(tag,text,className)=>{
    const element=document.createElement(tag);
    if (text!==undefined) element.textContent=text;
    if (className) element.className=className;
    return element;
  };
  graph.nodes.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(n=>{
    const option=make('option',`${displayName(n)} (${n.count})`); option.value=n.id; select.append(option);
  });
  function nameLines(name) {
    const lines=[]; let line='';
    for (const word of name.split(' ')) {
      if(line && `${line} ${word}`.length>19) {lines.push(line);line=word;}
      else line=line?`${line} ${word}`:word;
    }
    if(line) lines.push(line);
    return lines;
  }
  function colour(n) {return n.id===SELF?'#bd8c49':n.count>=5?'#32729a':n.count>=2?'#78a2bd':'#c5d9e5';}
  graph.nodes.forEach((n,i)=>{
    n.radius=n.id===SELF?24:8+Math.sqrt(n.count)*3;
    n.lines=nameLines(displayName(n));
    const angle=i*Math.PI*(3-Math.sqrt(5)), radius=50+Math.sqrt(i)*49;
    n.x=width/2+Math.cos(angle)*radius; n.y=height/2+Math.sin(angle)*radius*.8;
    if(n.id===SELF) {n.fx=width/2;n.fy=height/2-20;n.x=n.fx;n.y=n.fy;}
  });
  const svg=d3.select(container).append('svg').attr('viewBox',`0 0 ${width} ${height}`)
    .attr('role','group').attr('aria-labelledby','collaboration-svg-title collaboration-svg-desc');
  svg.append('title').attr('id','collaboration-svg-title').text('Collaboration network of Zehao Jin');
  svg.append('desc').attr('id','collaboration-svg-desc').text(`${overview}. Select any full-name node to see shared papers. Lines represent coauthorship within these publications. The layout is fixed.`);
  const edges=svg.append('g').attr('aria-hidden','true').selectAll('line').data(graph.links).join('line')
    .attr('class','collaboration-edge').attr('stroke-width',d=>.6+Math.sqrt(d.count)*.65);
  const nodes=svg.append('g').selectAll('g').data(graph.nodes).join('g')
    .attr('class',n=>`collaboration-node${n.id===SELF?' is-self':''}`).attr('data-author',n=>n.id)
    .attr('tabindex',0).attr('role','button').attr('aria-pressed','false')
    .attr('aria-label',n=>`${displayName(n)}, ${n.count} ${n.id===SELF?'published':'shared'} ${n.count===1?'paper':'papers'}. Show publications.`);
  nodes.append('title').text(n=>`${displayName(n)} · ${n.count} ${n.count===1?'paper':'papers'}`);
  nodes.append('circle').attr('r',n=>n.radius).attr('fill',colour);
  nodes.append('text').attr('class','collaboration-name').each(function(n) {
    const text=d3.select(this);
    n.lines.forEach((line,i)=>text.append('tspan').attr('x',0).attr('y',n.radius+20+i*18).text(line));
    n.labelWidth=Math.max(...Array.from(this.querySelectorAll('tspan'),line=>line.getComputedTextLength()));
    n.halfWidth=Math.max(n.radius,n.labelWidth/2)+9;
    n.top=-n.radius-8; n.bottom=n.radius+24+(n.lines.length-1)*18;
  });
  // Compute once with a deterministic seed: no moving simulation or drag handlers.
  const simulation=d3.forceSimulation(graph.nodes).randomSource(d3.randomLcg(.42))
    .force('links',d3.forceLink(graph.links).id(n=>n.id).distance(l=>130-12*Math.sqrt(l.count)).strength(.07))
    .force('charge',d3.forceManyBody().strength(-320))
    .force('x',d3.forceX(width/2).strength(.035))
    .force('y',d3.forceY(height/2-15).strength(.045))
    .force('collision',d3.forceCollide(57).iterations(3)).stop();
  simulation.tick(420);
  function bound(n) {
    if(n.id===SELF) {n.x=n.fx;n.y=n.fy;return;}
    n.x=Math.max(n.halfWidth+12,Math.min(width-n.halfWidth-12,n.x));
    n.y=Math.max(14-n.top,Math.min(height-n.bottom-14,n.y));
  }
  // Reserve the full label rectangle, not just the circular node, so long names fit.
  for(let pass=0;pass<220;pass++) {
    graph.nodes.forEach(bound);
    let collisions=0;
    for(let i=0;i<graph.nodes.length;i++) for(let j=i+1;j<graph.nodes.length;j++) {
      const a=graph.nodes[i], b=graph.nodes[j];
      const dx=b.x-a.x;
      const ac=a.y+(a.top+a.bottom)/2, bc=b.y+(b.top+b.bottom)/2, dy=bc-ac;
      const overlapX=a.halfWidth+b.halfWidth-Math.abs(dx);
      const overlapY=(a.bottom-a.top+b.bottom-b.top)/2-Math.abs(dy);
      if(overlapX<=0||overlapY<=0) continue;
      collisions++;
      const ax=a.id===SELF?0:b.id===SELF?1:.5, bx=1-ax;
      if(overlapX<overlapY) {
        const shift=(overlapX+.5)*(dx<0?-1:1); a.x-=shift*ax;b.x+=shift*bx;
      } else {
        const shift=(overlapY+.5)*(dy<0?-1:1); a.y-=shift*ax;b.y+=shift*bx;
      }
    }
    if(!collisions) break;
  }
  graph.nodes.forEach(bound);
  nodes.insert('rect','circle').attr('class','collaboration-hit').attr('x',n=>-n.halfWidth)
    .attr('y',n=>n.top).attr('width',n=>n.halfWidth*2).attr('height',n=>n.bottom-n.top).attr('rx',5);
  edges.attr('x1',l=>l.source.x).attr('y1',l=>l.source.y).attr('x2',l=>l.target.x).attr('y2',l=>l.target.y);
  nodes.attr('transform',n=>`translate(${n.x},${n.y})`);
  let selected=null, hovered=null;
  function paint(id) {
    const connected=new Set(id?[id]:[]);
    if(id) graph.links.forEach(l=>{
      if(l.source.id===id) connected.add(l.target.id);
      if(l.target.id===id) connected.add(l.source.id);
    });
    nodes.classed('is-active',n=>n.id===id).classed('is-muted',n=>!!id&&!connected.has(n.id))
      .attr('aria-pressed',n=>String(n.id===selected));
    edges.classed('is-active',l=>!!id&&(l.source.id===id||l.target.id===id))
      .classed('is-muted',l=>!!id&&l.source.id!==id&&l.target.id!==id);
    const person=byId.get(id);
    hoverInfo.textContent=person?`${displayName(person)} · ${person.count} ${person.id===SELF?'published':'shared'} ${person.count===1?'paper':'papers'}`:'';
  }
  function choose(id) {
    selected=id||null; select.value=selected||'';clear.disabled=!selected;
    detail.replaceChildren();
    if(!selected) detail.append(make('p','Select a name to see our shared publications.'));
    else {
      const person=byId.get(selected);
      detail.append(make('h3',displayName(person)),make('p',`${person.count} ${person.id===SELF?'published':'shared'} ${person.count===1?'paper':'papers'}`));
      const list=make('ul',undefined,'collaboration-paper-list');
      person.papers.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach(paper=>{
        const item=make('li'), link=make('a',paper.title);
        link.href=paper.url;link.target='_blank';link.rel='noopener noreferrer';
        item.append(link,make('span',`${paper.year} · ${paper.venue}`));list.append(item);
      });
      detail.append(list);
    }
    paint(selected);
  }
  nodes.on('pointerenter',(_,n)=>{hovered=n.id;paint(n.id);})
    .on('pointerleave',()=>{hovered=null;paint(selected);})
    .on('focus',(_,n)=>paint(n.id)).on('blur',()=>paint(hovered||selected))
    .on('click',(_,n)=>choose(n.id))
    .on('keydown',(event,n)=>{
      if(event.key==='Enter'||event.key===' ') {event.preventDefault();choose(n.id);}
      if(event.key==='Escape') {event.preventDefault();choose(null);}
    });
  select.addEventListener('change',()=>choose(select.value));
  clear.addEventListener('click',()=>choose(null));
  document.querySelector('.collaboration-toolbar').hidden=false;
  choose(null);
})();
