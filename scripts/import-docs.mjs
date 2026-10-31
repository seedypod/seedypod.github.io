// Import the developer reference from seedypod/core's `docs/` (an OKF v0.2
// bundle) into Nextra pages. core's docs/ stays the source of truth; rerun this
// after they change instead of editing the generated pages by hand.
//
//   CORE_DOCS=/path/to/core/docs CORE_COMMIT=<sha> node scripts/import-docs.mjs
//
// OKF frontmatter mapping: `title` and `description` become Nextra frontmatter;
// `status: draft` becomes a callout; `sources` becomes a footer; `type` and
// `generated` are dropped (provenance is the pinned commit in the footer).
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'

const docs = process.env.CORE_DOCS
const commit = process.env.CORE_COMMIT
if (!docs || !commit) throw new Error('Set CORE_DOCS and CORE_COMMIT')
const blob = (path) => `https://github.com/seedypod/core/blob/${commit}/${path}`

const adrs = (await readdir(join(docs, 'adr'))).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort()

// docs/<path> → site route (or output file). Anything not listed links to GitHub.
const pages = {
  'HANDOFF.md': 'developers/handoff',
  'implementation-plan.md': 'developers/implementation-plan',
  'DEPLOYMENT.md': 'developers/deployment',
  'hardware/hal.md': 'developers/hal',
  'hardware/pin-map.md': 'developers/hardware',
  'hardware/sim-bringup.md': 'developers/sim-bringup',
  'testing/index.md': 'developers/testing',
  'SENSORS.md': 'core/sensors',
  'ANALYSIS.md': 'core/analysis',
  'MAINTENANCE.md': 'core/maintenance',
  ...Object.fromEntries(adrs.map((f) => [`adr/${f}`, `developers/adr/${f.replace(/\.md$/, '')}`])),
}
const routes = {
  ...pages,
  'index.md': 'developers',
  'adr/index.md': 'developers/adr',
  'hardware/index.md': 'developers/hardware',
  'INSTALLATION.md': 'core/installation',
  'DEBUGGING.md': 'core/debugging',
  'PRIVACY.md': 'core/privacy',
}

function resolveLink(from, target) {
  if (/^[a-z]+:/i.test(target) || target.startsWith('#')) return target
  const [path, fragment] = target.split('#')
  const base = path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(from), path)
  const norm = posix.normalize(base).replace(/\/$/, '')
  const key = routes[norm] ? norm : routes[norm + '/index.md'] ? norm + '/index.md' : norm
  const route = routes[key]
  if (route) return `/${route}/` + (fragment ? `#${fragment}` : '')
  return blob(posix.join('docs', norm)) + (fragment ? `#${fragment}` : '')
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

async function convert(from) {
  const src = await readFile(join(docs, from), 'utf8')
  const { meta, body } = parseFrontmatter(src)
  const title = meta.title ?? body.match(/^# (.+)$/m)?.[1] ?? from
  const lines = ['---', `title: ${yaml(title)}`]
  if (meta.description) lines.push(`description: ${yaml(meta.description)}`)
  lines.push('---', '', "import { Callout } from 'nextra/components'", '')
  let content = transformBody(from, body)
  if (meta.status === 'draft') {
    const callout =
      '<Callout type="warning">\n  Draft. This page describes intended behaviour that has not been verified on a real Gardyn yet.\n</Callout>'
    // Place the callout directly under the H1.
    content = content.replace(/^(# .+\n)/m, `$1\n${callout}\n`)
    if (!content.includes(callout)) content = callout + '\n\n' + content
  }
  lines.push(content, '', '---', '')
  const refs = (meta.sources ?? []).map((s) => `[${s.title}](${resolveLink(from, s.resource)})`)
  if (refs.length) lines.push(`**Sources:** ${refs.join(' · ')}`, '')
  lines.push(
    `**Imported from** [\`docs/${from}\`](${blob('docs/' + from)}) in seedypod/core. Edit it there, not here.`,
    '',
  )
  return { title, text: lines.join('\n') }
}

await rm('content/developers/adr', { recursive: true, force: true })
const index = await readFile(join(docs, 'adr/index.md'), 'utf8')
// Sidebar labels: the short link text from docs/adr/index.md, else the ADR title.
const shortTitles = Object.fromEntries(
  [...index.matchAll(/^- \[(\d{4} [^\]]+)\]\((\d{4}-[^)]+)\.md\)/gm)].map((m) => [m[2], m[1]]),
)
const adrMeta = { index: 'Index' }
for (const [from, route] of Object.entries(pages)) {
  const { title, text } = await convert(from)
  const file = `content/${route}.mdx`
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, text)
  if (from.startsWith('adr/')) {
    const slug = route.split('/').pop()
    adrMeta[slug] = shortTitles[slug] ?? title.replace(/^ADR (\d{4}): /, '$1 ')
  }
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
    transformBody('adr/index.md', index),
    '',
    '---',
    '',
    `**Imported from** [\`docs/adr/index.md\`](${blob('docs/adr/index.md')}) in seedypod/core.`,
    '',
  ].join('\n'),
)
await writeFile(
  'content/developers/adr/_meta.ts',
  `export default ${JSON.stringify(adrMeta, null, 2)}\n`,
)
console.log(`Imported ${Object.keys(pages).length} pages and the ADR index from ${commit}`)
