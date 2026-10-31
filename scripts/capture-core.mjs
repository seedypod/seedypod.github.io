// Capture real seedypod web UI screenshots from a demo build of seedypod/core.
//
//   cd <core checkout at CORE_COMMIT>
//   VITE_DEMO=1 npx vite build --config web/vite.config.ts --outDir /tmp/seedypod-demo
//   DEMO_DIST=/tmp/seedypod-demo CORE_COMMIT=<sha> node scripts/capture-core.mjs
//
// The demo build runs the real UI against the in-browser simulator with seeded
// history, so no hardware and no network are involved. Writes public/media/*.png
// and rewrites capture/manifest.json.
import { createServer } from 'node:http'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, extname, sep } from 'node:path'
import { chromium } from '@playwright/test'
import sharp from 'sharp'

const root = resolve(process.env.DEMO_DIST ?? '')
const commit = process.env.CORE_COMMIT
if (!process.env.DEMO_DIST || !commit) throw new Error('Set DEMO_DIST and CORE_COMMIT')

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}
const server = createServer(async (req, res) => {
  let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (path !== root && !path.startsWith(root + sep)) return res.writeHead(403).end()
  try {
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
  } catch {
    path = resolve(root, 'index.html') // SPA fallback
  }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' })
  res.end(await readFile(path))
})
await new Promise((r) => server.listen(4180, '127.0.0.1', r))

const shots = [
  { route: '/', output: 'core-dashboard.png' },
  { route: '/light', output: 'core-light.png' },
  { route: '/water', output: 'core-water.png' },
  { route: '/schedule', output: 'core-schedule.png' },
  { route: '/grow', output: 'core-grow.png' },
  { route: '/cameras', output: 'core-cameras.png' },
  { route: '/alerts', output: 'core-alerts.png' },
  { route: '/settings', output: 'core-settings.png' },
  { route: '/kiosk', output: 'core-kiosk.png' },
]

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  reducedMotion: 'reduce',
})
await mkdir('public/media', { recursive: true })
const assets = []
for (const { route, output } of shots) {
  await page.goto('http://127.0.0.1:4180' + route)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  const file = `public/media/${output}`
  await page.screenshot({ path: file })
  const b = await readFile(file)
  const optimized = await sharp(b).png({ compressionLevel: 9, palette: false }).toBuffer()
  await writeFile(file, optimized)
  const m = await sharp(optimized).metadata()
  assets.push({
    repository: 'seedypod/core',
    commit,
    source: `web demo build (VITE_DEMO=1), route ${route}`,
    output,
    method: 'scripts/capture-core.mjs (Playwright, 1440x1000 @2x, dark)',
    sha256: createHash('sha256').update(optimized).digest('hex'),
    bytes: optimized.length,
    width: m.width,
    height: m.height,
  })
  console.log(`captured ${route} → ${output}`)
}
await browser.close()
server.close()

const icon = await readFile('public/media/seedypod-icon.svg')
assets.push({
  repository: 'seedypod/core',
  commit,
  source: 'web/public/favicon.svg',
  output: 'seedypod-icon.svg',
  method: 'copied unchanged',
  sha256: createHash('sha256').update(icon).digest('hex'),
  bytes: icon.length,
})
await writeFile('capture/manifest.json', JSON.stringify({ version: 1, assets }, null, 2) + '\n')
