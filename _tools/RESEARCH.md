# Research constellation and publication tracker

`_data/research.json` is the shared source for the homepage map and maintained publication list. Jekyll renders the full bibliography even without JavaScript. The vanilla JavaScript adds filtering and draws the SVG constellation; there are no runtime package dependencies.

To add a paper, copy an existing record with a new stable `id`, preserve the category/date ordering, and supply its bibliographic fields and tag IDs. `status: "published"` includes it in the map denominator; submitted records remain in the publication list only and have null publication year/date. Use `roles` for first/co-first author, corresponding author, and highlighted. Do not infer corresponding authorship from author order.

Each published record is counted once per matching cell or marginal. It has one star in every scale × approach combination assigned to it. Multi-tag percentages need not sum to 100%. Cell and marginal percentages all use the full published-record count, including workshop papers. Current count: 15. The submitted extension is not counted as another published paper.

Tag evidence URLs live alongside each record; classification boundaries live in `policy`. Simulation includes use of existing outputs (author confirmed 2026-11-05). Observational data includes quantitative comparisons with measurements. Representation learning includes ICA and learned stellar latent variables, not only neural networks. Causa prima belongs to galaxies, leaving cosmology empty. General physics is explicitly cross-scale. The least-action paper uses tabular reinforcement learning and a numerical light-propagation environment, so it is tagged reinforcement learning and numerical simulation, not deep learning. The author requested the additional reinforcement-learning approach on 2026-11-05.

Publication filters use intersection (all selected tags), synchronize buttons in the filter panel and paper entries, and store choices in `?tags=` for sharable links. Empty categories disappear. The publication text, author symbols, date audit, and conference/talk list retain their original content.

Run `node _tools/research.test.cjs` for independent count/filter fixtures and tracker checks. Preview changes before publishing; no push is part of the preview workflow.

## Collaboration network

The homepage network uses the same published records. Each record has `authorIds`; the top-level `authors` list resolves those IDs to full names and primary-source evidence. Preserve accents and published middle initials. Yuxi (Lucy) Lu and Yu Luo are different people. New authors require a unique stable ID and a verified byline or other primary source. Keep author IDs in byline order; the abbreviated bibliography remains unchanged.

Node counts are the number of published records containing that author. Links count the actual intersection of two authors' paper memberships; they do not infer other collaborations outside this publication list. The submitted extension is excluded. The current network has 37 coauthors plus Zehao Jin, 15 papers, and 187 coauthorship pairs.

Institution counts use affiliations on those papers, as confirmed by the author on 2026-11-05, rather than current affiliations. Each published paper stores `authorInstitutionIds` plus an `affiliationAudit` containing original byline affiliation strings, author markers, and source URLs. The top-level `institutions` directory normalizes repeated institutions. The displayed count is the union across published author-paper memberships: currently 30. University departments/centers are merged, including NYU Abu Dhabi and NYU New York under New York University. Named research institutes remain distinct even under a shared national umbrella. Ciela/Mila remain separate from Université de Montréal; CIFAR byline chair/fellow affiliations count once as an organizational affiliation. See `policy.institutions` for the full counting convention.

Nine authors have verified `chineseName` fields, with `chineseNameSources` and `chineseNameEvidence`. These display alongside their full English names. Preserve verified simplified/traditional characters and user-confirmed spellings; do not guess Chinese characters from romanized names. Unverified names stay in their published Latin form.

The layout is computed once using a deterministic force placement followed by full-label collision resolution. It is fixed, with no dragging or animated simulation, as requested by the author. Names can be selected with a pointer, keyboard, or dropdown to highlight connections and show the shared papers. Locally hosted D3 7.9.0 is in `assets/vendor/`, with its ISC license in `D3-LICENSE`. Network scripts/styles load only on the homepage. Run `node _tools/collaboration.test.cjs` for membership and edge-count tests.
