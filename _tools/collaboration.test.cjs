const assert=require('node:assert/strict');
const {collaborations}=require('../assets/research-model.js');
const data=require('../_data/research.json');
const p={id:'p',status:'published',authorIds:['a','b','b'],authorInstitutionIds:{a:['u1','u2'],b:['u1']}};
const q={id:'q',status:'published',authorIds:['a','c'],authorInstitutionIds:{a:['u1'],c:['u2','u3']}};
const r={id:'r',status:'published',authorIds:['a','b','c'],authorInstitutionIds:{a:['u2'],b:['u1'],c:['u3']}};
const draft={id:'draft',status:'submitted',authorIds:['a','d'],authorInstitutionIds:{a:['u1'],d:['u4']}};
const graph=collaborations({authors:['a','b','c','d'].map(id=>({id,name:id})),
  institutions:['u1','u2','u3','u4'].map(id=>({id,name:id})),papers:[p,q,r,draft,p]});
assert.equal(graph.total,3);
assert.equal(graph.nodes.length,3);
assert.equal(graph.links.length,3);
const pair=(g,a,b)=>g.links.find(l=>l.source===a&&l.target===b).count;
assert.equal(pair(graph,'a','b'),2);
assert.equal(pair(graph,'a','c'),2);
assert.equal(pair(graph,'b','c'),1); // Intersection, not min(author totals).
assert.deepEqual(graph.institutions.map(i=>i.id),['u1','u2','u3']); // Shared and repeated affiliations count once; drafts excluded.
assert.deepEqual(graph.nodes.find(n=>n.id==='a').institutionIds,['u1','u2']); // Both affiliations retained.
const actual=collaborations(data);
assert.equal(actual.total,15);
assert.equal(actual.nodes.length,38);
assert.equal(actual.institutions.length,30);
assert.equal(new Set(actual.institutions.map(i=>i.id)).size,30);
assert.equal(actual.institutions.filter(i=>i.id==='nyu').length,1);
assert(!actual.institutions.some(i=>i.id==='nyu-abu-dhabi'));
assert.equal(actual.nodes.find(n=>n.id==='zehao-jin').count,15);
assert.equal(actual.nodes.find(n=>n.id==='benjamin-l-davis').count,10);
assert.equal(actual.nodes.find(n=>n.id==='andrea-valerio-maccio').count,8);
assert(actual.nodes.some(n=>n.name==='Yu Luo'));
assert(actual.nodes.some(n=>n.name==='Yuxi (Lucy) Lu'));
assert.equal(actual.nodes.filter(n=>n.chineseName).length,9);
assert.equal(actual.nodes.find(n=>n.id==='zehao-jin').chineseName,'金泽灏');
assert.equal(actual.nodes.find(n=>n.id==='yuan-sen-ting').chineseName,'丁源森');
const institutionIds=new Set(data.institutions.map(i=>i.id));
for(const paper of data.papers) {
  assert.equal(paper.authorIds.length,paper.authorsMarkdown.split(', ').length);
  assert.equal(new Set(paper.authorIds).size,paper.authorIds.length);
  if(paper.status==='published') {
    assert.deepEqual(Object.keys(paper.authorInstitutionIds).sort(),paper.authorIds.slice().sort());
    assert.match(paper.affiliationAudit.source,/^https:\/\//);
    const affiliationLabels=new Map(paper.affiliationAudit.affiliations.map(a=>[a.label,a]));
    for(const [authorId,ids] of Object.entries(paper.authorInstitutionIds)) {
      assert(ids.length);
      assert.equal(new Set(ids).size,ids.length);
      ids.forEach(id=>assert(institutionIds.has(id)));
      const auditedIds=[...new Set(paper.affiliationAudit.authorLabels[authorId].flatMap(label=>affiliationLabels.get(label).institutionIds))].sort();
      assert.deepEqual(ids.slice().sort(),auditedIds);
    }
  }
}
for(const node of actual.nodes) {assert(node.name.includes(' '));assert(node.sources.length);}
for(const link of actual.links) {assert.notEqual(link.source,link.target);assert.equal(link.count,new Set(link.papers.map(p=>p.id)).size);}
console.log(`${actual.nodes.length-1} coauthors, ${actual.total} published papers, ${actual.institutions.length} institutions, ${actual.links.length} verified coauthorship links. Checks passed.`);
