/* Shared, dependency-free semantics for the constellation and publication filters. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ResearchModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const tags = paper => [...new Set([...paper.scales, ...paper.approaches, ...paper.roles])];
  const matches = (paper, selected) => [...selected].every(tag => tags(paper).includes(tag));
  const published = papers => [...new Map(papers.filter(p => p.status === 'published').map(p => [p.id, p])).values()];
  const percent = (count, total) => total ? Math.round(count / total * 1000) / 10 : 0;
  function statistics(data) {
    const papers = published(data.papers);
    const total = papers.length;
    const measure = items => ({count: items.length, percent: percent(items.length, total), papers: items});
    return {total, papers,
      scales: data.scales.map(s => ({...s, ...measure(papers.filter(p => p.scales.includes(s.id)))})),
      approaches: data.approaches.map(a => ({...a, ...measure(papers.filter(p => p.approaches.includes(a.id)))})),
      cells: data.approaches.flatMap(a => data.scales.map(s => ({scale: s.id, approach: a.id,
        ...measure(papers.filter(p => p.scales.includes(s.id) && p.approaches.includes(a.id)))})))
    };
  }
  function collaborations(data) {
    const authors = new Map(data.authors.map(author => [author.id, author]));
    const institutionDirectory = new Map((data.institutions || []).map(institution => [institution.id, institution]));
    const institutionIds = new Set();
    const nodes = new Map(), links = new Map();
    const papers = published(data.papers);
    for (const paper of papers) {
      const ids = [...new Set(paper.authorIds)];
      for (const id of ids) {
        if (!authors.has(id)) throw new Error(`Unknown author: ${id}`);
        if (!nodes.has(id)) nodes.set(id, {...authors.get(id), papers: [], institutionIds:new Set()});
        nodes.get(id).papers.push(paper);
        for (const institutionId of paper.authorInstitutionIds?.[id] || []) {
          if (!institutionDirectory.has(institutionId)) throw new Error(`Unknown institution: ${institutionId}`);
          institutionIds.add(institutionId);
          nodes.get(id).institutionIds.add(institutionId);
        }
      }
      for (let i=0; i<ids.length; i++) for (let j=i+1; j<ids.length; j++) {
        const pair = [ids[i],ids[j]].sort(), key=pair.join('|');
        if (!links.has(key)) links.set(key,{source:pair[0],target:pair[1],papers:[]});
        links.get(key).papers.push(paper);
      }
    }
    return {nodes:[...nodes.values()].map(n=>({...n,count:n.papers.length,institutionIds:[...n.institutionIds]})),
      links:[...links.values()].map(l=>({...l,count:l.papers.length})), total:papers.length,
      institutions:[...institutionIds].map(id=>institutionDirectory.get(id)).sort((a,b)=>a.name.localeCompare(b.name))};
  }
  return {tags, matches, published, percent, statistics, collaborations};
});
