// Import the developer reference from seedypod/core's `docs/` and the owner-facing
// notes from its `knowledge/` (both OKF v0.2 bundles) into Nextra pages. core
// stays the source of truth; rerun this after they change instead of editing the
// generated pages by hand.
//
//   CORE_DOCS=/path/to/core/docs CORE_COMMIT=<sha> node scripts/import-docs.mjs
//
// The knowledge bundle is read from CORE_DOCS/../knowledge unless CORE_KNOWLEDGE
// is set.
//
// OKF frontmatter mapping: `title` and `description` become Nextra frontmatter;
// `status: draft` becomes a callout; `sources` becomes a footer; `type` and
// `generated` are dropped (provenance is the pinned commit in the footer).
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'

const docs = process.env.CORE_DOCS
const commit = process.env.CORE_COMMIT
if (!docs || !commit) throw new Error('Set CORE_DOCS and CORE_COMMIT')
const knowledge = process.env.CORE_KNOWLEDGE ?? join(docs, '..', 'knowledge')
const bundles = { docs, knowledge }
const blob = (path) => `https://github.com/seedypod/core/blob/${commit}/${path}`

const adrs = (await readdir(join(docs, 'adr'))).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort()

// knowledge/<section>/ → /knowledge/<section>/. Published: the sections behind the
// app's care advice, and operations (the pump safety limits and the measured traces
// behind them). Hardware, evaluation and references are developer evidence and link
// to GitHub like any other repository file, as do non-note files such as a trace's
// CSV.
const sections = new Set(['operations', 'watering', 'nutrients', 'plants'])
const knowledgeIndex = await readFile(join(knowledge, 'index.md'), 'utf8')
// Section order and one-line summaries: the published entries of knowledge/index.md.
const sectionLinks = [
  ...knowledgeIndex.matchAll(/^- \[([^\]]+)\]\(([a-z-]+)\/index\.md\)(.*)$/gm),
].filter((m) => sections.has(m[2]))
const notes = {}
for (const [, , section] of sectionLinks)
  for (const f of (await readdir(join(knowledge, section))).sort())
    if (f.endsWith('.md') && f !== 'index.md')
      notes[`knowledge/${section}/${f}`] = `knowledge/${section}/${f.replace(/\.md$/, '')}`

// <repo path> → site route (or output file). Anything not listed links to GitHub.
const pages = {
  'docs/HANDOFF.md': 'developers/handoff',
  'docs/implementation-plan.md': 'developers/implementation-plan',
  'docs/DEPLOYMENT.md': 'developers/deployment',
  'docs/hardware/hal.md': 'developers/hal',
  'docs/hardware/pin-map.md': 'developers/hardware',
  'docs/hardware/sim-bringup.md': 'developers/sim-bringup',
  'docs/testing/index.md': 'developers/testing',
  'docs/SENSORS.md': 'core/sensors',
  'docs/FEEDING.md': 'core/feeding',
  'docs/ANALYSIS.md': 'core/analysis',
  'docs/MAINTENANCE.md': 'core/maintenance',
  'docs/AUTOPILOT.md': 'core/autopilot',
  ...Object.fromEntries(
    adrs.map((f) => [`docs/adr/${f}`, `developers/adr/${f.replace(/\.md$/, '')}`]),
  ),
  ...notes,
  ...Object.fromEntries(
    sectionLinks.map(([, , s]) => [`knowledge/${s}/index.md`, `knowledge/${s}`]),
  ),
}
const routes = {
  ...pages,
  'docs/index.md': 'developers',
  'docs/adr/index.md': 'developers/adr',
  'docs/hardware/index.md': 'developers/hardware',
  'docs/INSTALLATION.md': 'core/installation',
  'docs/DEBUGGING.md': 'core/debugging',
  'docs/PRIVACY.md': 'core/privacy',
  'knowledge/index.md': 'knowledge',
}

// Links into core on GitHub, at any branch or commit.
const coreBlob = /^https:\/\/github\.com\/seedypod\/core\/blob\/[^/#]+\/([^#]+)(#.*)?$/

function resolveLink(from, target) {
  const github = target.match(coreBlob)
  if (github && routes[github[1]]) return `/${routes[github[1]]}/` + (github[2] ?? '')
  if (/^[a-z]+:/i.test(target) || target.startsWith('#')) return target
  const [path, fragment] = target.split('#')
  // A leading slash is the root of the linking file's bundle (docs/ or knowledge/).
  const base = path.startsWith('/')
    ? posix.join(from.split('/')[0], path)
    : posix.join(posix.dirname(from), path)
  const norm = posix.normalize(base).replace(/\/$/, '')
  const key = routes[norm] ? norm : routes[norm + '/index.md'] ? norm + '/index.md' : norm
  const route = routes[key]
  if (route) return `/${route}/` + (fragment ? `#${fragment}` : '')
  return blob(norm) + (fragment ? `#${fragment}` : '')
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return { meta: {}, body: src }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    const raw = line.slice(i + 1).trim()
    try {
      meta[key] = JSON.parse(raw)
    } catch {
      meta[key] = raw.replace(/^"|"$/g, '')
    }
  }
  return { meta, body: src.slice(m[0].length) }
}

// Escape characters MDX would treat as JSX or expressions, outside code.
function escapeMdx(text) {
  return text
    .split(/(`[^`\n]*`)/)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/[{}]/g, (c) => '\\' + c)
            .replace(/<(?!\/?[a-z][\w-]*[\s>/])/gi, '&lt;')
            .replace(/<([a-z][\w-]*)>/gi, '&lt;$1&gt;'),
    )
    .join('')
}

function transformBody(from, body) {
  const out = []
  let fence = false
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) {
      fence = !fence
      out.push(line)
      continue
    }
    if (fence) {
      out.push(line)
      continue
    }
    const linked = line.replace(/\]\(([^)\s]+)\)/g, (_, t) => `](${resolveLink(from, t)})`)
    out.push(escapeMdx(linked))
  }
  return out.join('\n').trim()
}

const yaml = (s) => JSON.stringify(s)

const drafts = {
  docs: 'Draft. Parts of this page describe behaviour not yet verified on a real Gardyn.',
  knowledge:
    'Draft. An agent compiled this note from the sources below; no human review is claimed.',
}

async function convert(from) {
  const [bundle, ...rest] = from.split('/')
  const src = await readFile(join(bundles[bundle], ...rest), 'utf8')
  const { meta, body } = parseFrontmatter(src)
  const title = meta.title ?? body.match(/^# (.+)$/m)?.[1] ?? from
  const lines = ['---', `title: ${yaml(title)}`]
  if (meta.description) lines.push(`description: ${yaml(meta.description)}`)
  lines.push('---', '', "import { Callout } from 'nextra/components'", '')
  let content = transformBody(from, body)
  if (meta.status === 'draft') {
    const callout = `<Callout type="warning">\n  ${drafts[bundle]}\n</Callout>`
    // Place the callout directly under the H1.
    content = content.replace(/^(# .+\n)/m, `$1\n${callout}\n`)
    if (!content.includes(callout)) content = callout + '\n\n' + content
  }
  lines.push(content, '', '---', '')
  const refs = (meta.sources ?? []).map((s) => `[${s.title}](${resolveLink(from, s.resource)})`)
  if (refs.length) lines.push(`**Sources:** ${refs.join(' · ')}`, '')
  lines.push(
    `**Imported from** [\`${from}\`](${blob(from)}) in seedypod/core. Edit it there, not here.`,
    '',
  )
  return { title, text: lines.join('\n') }
}

const writeMeta = (dir, meta) =>
  writeFile(`content/${dir}/_meta.ts`, `export default ${JSON.stringify(meta, null, 2)}\n`)

await rm('content/developers/adr', { recursive: true, force: true })
await rm('content/knowledge', { recursive: true, force: true })
const index = await readFile(join(docs, 'adr/index.md'), 'utf8')
// Sidebar labels: the short link text from docs/adr/index.md, else the ADR title.
const shortTitles = Object.fromEntries(
  [...index.matchAll(/^- \[(\d{4} [^\]]+)\]\((\d{4}-[^)]+)\.md\)/gm)].map((m) => [m[2], m[1]]),
)
const adrMeta = { index: 'Index' }
const sectionMeta = {}
for (const [from, route] of Object.entries(pages)) {
  const { title, text } = await convert(from)
  // A knowledge section's index.md is its folder's index page.
  const file = `content/${route}${from.startsWith('knowledge/') && from.endsWith('/index.md') ? '/index' : ''}.mdx`
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, text)
  const slug = route.split('/').pop()
  if (from.startsWith('docs/adr/'))
    adrMeta[slug] = shortTitles[slug] ?? title.replace(/^ADR (\d{4}): /, '$1 ')
  if (from in notes) (sectionMeta[route.split('/')[1]] ??= { index: 'Overview' })[slug] = title
}

// ADR index: generated from docs/adr/index.md, so placeholders (0008) stay visible.
await writeFile(
  'content/developers/adr/index.mdx',
  [
    '---',
    'title: Architecture decision records',
    'description: Why seedypod is built the way it is, one decision at a time.',
    '---',
    '',
    transformBody('docs/adr/index.md', index),
    '',
    '---',
    '',
    `**Imported from** [\`docs/adr/index.md\`](${blob('docs/adr/index.md')}) in seedypod/core.`,
    '',
  ].join('\n'),
)
await writeMeta('developers/adr', adrMeta)

// Knowledge index: the published sections of knowledge/index.md. Its own intro is
// written for contributors, so this page has its own.
await writeFile(
  'content/knowledge/index.mdx',
  [
    '---',
    'title: Knowledge',
    `description: ${yaml("The evidence behind seedypod's care advice and pump safety: watering cadences, feeding doses, pH and EC targets, light zones, and measured pump current, each with its sources.")}`,
    '---',
    '',
    '# Knowledge',
    '',
    "These notes are where seedypod's numbers come from. When the web UI suggests a watering",
    'cadence, a dose or a pH or EC target, it links the section here it is taken from. Each note',
    'lists its sources; most are agent-compiled drafts that no human has reviewed yet. The',
    'operations notes record the pump safety limits and the measured pump-current traces that',
    'set them.',
    '',
    ...sectionLinks.map(([line]) => transformBody('knowledge/index.md', line)),
    '',
    `Hardware facts and evaluations are developer evidence and stay in core's [knowledge bundle](${blob('knowledge/index.md')}).`,
    '',
    '---',
    '',
    `**Imported from** [\`knowledge/\`](${blob('knowledge/index.md')}) in seedypod/core. Edit it there, not here.`,
    '',
  ].join('\n'),
)
await writeMeta('knowledge', {
  index: 'Overview',
  ...Object.fromEntries(sectionLinks.map(([, title, s]) => [s, title])),
})
for (const [section, meta] of Object.entries(sectionMeta))
  await writeMeta(`knowledge/${section}`, meta)

// Plants: a page per catalog plant from core's src/plants/catalog.json and
// care.json, so the Core palette's docs search finds every yCube by name.
const plantsDir = process.env.CORE_PLANTS ?? join(docs, '..', 'src', 'plants')
const catalog = JSON.parse(await readFile(join(plantsDir, 'catalog.json'), 'utf8'))
const care = JSON.parse(await readFile(join(plantsDir, 'care.json'), 'utf8'))
const kinds = {
  green: ['Leafy greens', 'Leafy green'],
  lettuce: ['Lettuces', 'Lettuce'],
  herb: ['Herbs', 'Herb'],
  vegetable: ['Vegetables', 'Vegetable'],
  legume: ['Legumes', 'Legume'],
  fruiting: ['Fruiting plants', 'Fruiting plant'],
  flower: ['Flowers', 'Flower'],
}
const span = ([a, b], unit) => `${a === b ? a : `${a}–${b}`} ${unit}`
// Mirrors thinRule in core's src/plants/catalog.ts, for the one plant Gardyn gives no count.
const thinRule = (p) =>
  p.category === 'herb' || (p.category === 'flower' && p.size !== 'large') ? 3 : 1
const thinCount = (n) => (n === 'all' ? 'Don’t thin' : `Keep ${n} sprout${n === 1 ? '' : 's'}`)
const notesOrder = [
  ['harvest', 'Harvest'],
  ['prune', 'Pruning'],
  ['support', 'Support'],
  ['pollinate', 'Pollinating'],
  ['health', 'Pests and disease'],
  ['climate', 'Climate'],
]
const plantBlobs = ['catalog.json', 'care.json'].map(
  (f) => `[\`${f}\`](${blob(`src/plants/${f}`)})`,
)

function plantPage(p) {
  const f = catalog.facts[p.id] ?? {}
  const notes = care.plants[p.id] ?? {}
  const kind = kinds[p.category][1]
  const thinTo = f.thinTo ?? thinRule(p)
  const sprout = catalog.sproutDays[p.id] ?? catalog.categorySproutMedians[p.category]
  const zone = `${p.zone[0].toUpperCase()}${p.zone.slice(1)}`
  const facts = [
    [
      'Thinning',
      thinTo === 'all'
        ? 'Don’t thin. Let every sprout in the pod grow.'
        : `${thinCount(thinTo)} per pod and cut the rest at the base.` +
          (f.thinTo
            ? ''
            : ` Gardyn gives no count for ${p.name}, so this is the rule for its kind.`),
    ],
    [
      'Sprouts in',
      span(sprout, 'days') + (catalog.sproutDays[p.id] ? '' : ' (typical for its kind)'),
    ],
    [
      'First harvest',
      `${span(p.harvestMonths, 'months')} after planting` +
        (p.harvestEstimated ? ' (typical for its kind)' : ''),
    ],
    ['Matures in', f.maturityDays && span(f.maturityDays, 'days')],
    ['Height', f.heightFt && `${f.heightFt.replace(/^</, 'under ')} ft`],
    ['Temperature', f.tempF && span(f.tempF, '°F')],
    ['Light zone', `[${zone}](/knowledge/plants/gardyn-light-zones/)`],
    [
      'Full dose of plant food',
      f.fullDose &&
        (f.fullDose === 'roots'
          ? 'Once the roots are 1/2 inch long'
          : 'Once it has true leaves or roots 1/2 inch long'),
    ],
    ['Care level', p.careLevel && `${p.careLevel[0].toUpperCase()}${p.careLevel.slice(1)}`],
    ['Yield', p.yield && `${p.yield[0].toUpperCase()}${p.yield.slice(1)}`],
  ].filter(([, v]) => v)
  const sentence = [
    thinTo === 'all' ? 'Don’t thin' : `${thinCount(thinTo).replace(/^K/, 'k')} per pod`,
    `sprouts in ${span(sprout, 'days')}`,
    `first harvest after ${span(p.harvestMonths, 'months')}`,
  ].join('; ')
  const description = `${kind} for the ${p.zone} light zone. ${sentence[0].toUpperCase()}${sentence.slice(1)}.`
  const keywords = [
    f.latinName?.replace(/['‘’]/g, ''),
    kind.toLowerCase(),
    'ycube',
    p.id.replace(/-/g, ' '),
  ]
  const sources = [
    f.article && `[Gardyn’s ${p.name} page](https://help.mygardyn.com/en/articles/${f.article})`,
    '[Sprouts to keep](/knowledge/plants/thinning/)',
    '[Catalog provenance](/knowledge/plants/catalog-provenance/)',
  ].filter(Boolean)
  return [
    '---',
    `title: ${yaml(p.name)}`,
    `description: ${yaml(description)}`,
    `keywords: ${yaml(keywords.filter(Boolean).join(' '))}`,
    '---',
    '',
    `# ${escapeMdx(p.name)}`,
    '',
    [f.latinName && `*${escapeMdx(f.latinName)}*`, kind].filter(Boolean).join(' · '),
    '',
    '## At a glance',
    '',
    ...facts.map(([k, v]) => `- **${k}:** ${escapeMdx(v)}`),
    '',
    ...notesOrder.flatMap(([k, label]) =>
      notes[k] ? [`## ${label}`, '', escapeMdx(notes[k]), ''] : [],
    ),
    '---',
    '',
    `**Sources:** ${sources.join(' · ')}`,
    '',
    `**Generated from** ${plantBlobs.join(' and ')} in seedypod/core. The care notes are rewritten in seedypod's own words from Gardyn's plant pages. Edit them there, not here.`,
    '',
  ].join('\n')
}

await rm('content/plants', { recursive: true, force: true })
await mkdir('content/plants', { recursive: true })
const byKind = Object.keys(kinds).map((k) => [
  k,
  catalog.plants.filter((p) => p.category === k).sort((a, b) => a.name.localeCompare(b.name)),
])
for (const [, plants] of byKind)
  for (const p of plants) await writeFile(`content/plants/${p.id}.mdx`, plantPage(p))
const plantRow = (p) => {
  const thinTo = catalog.facts[p.id]?.thinTo ?? thinRule(p)
  return `| [${escapeMdx(p.name)}](/plants/${p.id}/) | ${thinTo === 'all' ? 'Don’t thin' : thinTo} | ${span(p.harvestMonths, 'mo')} |`
}
await writeFile(
  'content/plants/index.mdx',
  [
    '---',
    'title: Plants',
    `description: ${yaml(`Every yCube seedypod knows, ${catalog.plants.length} in all: how many sprouts to keep in each pod, how long it takes to sprout and to harvest, and how to look after it.`)}`,
    'keywords: "ycube catalog thin thinning sprouts seedlings harvest care"',
    '---',
    '',
    '# Plants',
    '',
    `Every yCube in seedypod's catalog, ${catalog.plants.length} in all. Each page says how many sprouts to keep when you thin the pod, how long the plant takes to sprout and to reach its first harvest, and how to harvest, prune and look after it. The facts come from Gardyn's plant pages and yCube store; the [catalog provenance](/knowledge/plants/catalog-provenance/) note says which.`,
    '',
    'Thin each pod to its count once the seedlings are up, cutting the extras at the base rather than pulling them. [Sprouts to keep](/knowledge/plants/thinning/) explains the counts and where Gardyn contradicts itself.',
    '',
    ...byKind.flatMap(([k, plants]) => [
      `## ${kinds[k][0]}`,
      '',
      '| Plant | Sprouts to keep | First harvest |',
      '| --- | --- | --- |',
      ...plants.map(plantRow),
      '',
    ]),
    '---',
    '',
    `**Generated from** ${plantBlobs.join(' and ')} in seedypod/core. Edit them there, not here.`,
    '',
  ].join('\n'),
)
await writeMeta(
  'plants',
  Object.fromEntries([
    ['index', 'Overview'],
    ...byKind.flatMap(([k, plants]) => [
      [`-- ${k}`, { type: 'separator', title: kinds[k][0] }],
      ...plants.map((p) => [p.id, p.name]),
    ]),
  ]),
)
console.log(
  `Imported ${Object.keys(pages).length} pages, the ADR index and the knowledge index from ${commit}`,
)
console.log(`Generated ${catalog.plants.length} plant pages and the plant index`)
