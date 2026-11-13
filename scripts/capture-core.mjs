// Capture real seedypod web UI screenshots from a demo build of seedypod/core.
//
//   cd <core checkout at CORE_COMMIT>
//   VITE_DEMO=1 npx vite build --config web/vite.config.ts --outDir /tmp/seedypod-demo
//   DEMO_DIST=/tmp/seedypod-demo CORE_COMMIT=<sha> node scripts/capture-core.mjs
//
// The demo build runs the real UI against the in-browser simulator with seeded
// history, so no hardware and no network are involved: requests off the loopback
// origin are blocked, and the clock is fixed at midday so the grow light is on.
// Writes public/media/core-* and rewrites their entries in capture/manifest.json.
import { createServer } from 'node:http'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, extname, sep } from 'node:path'
import { chromium, expect } from '@playwright/test'
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
  '.webp': 'image/webp',
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
const origin = 'http://127.0.0.1:4180'
const capturedTime = '2026-11-01T19:30:00Z'

/** One notch of zoom on the 3D tower, so it fills the frame. */
async function zoomTower(page) {
  const b = await page.getByTestId('tower-3d').boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.4)
  await page.keyboard.down('Meta')
  await page.mouse.wheel(0, -100)
  await page.keyboard.up('Meta')
  await page.mouse.move(5, 995)
}

/** Click a stop on the Light strip's slider: 0 is Auto, then Off, 25, 50, 75, 100. */
async function pickStop(page, i) {
  const b = await page.getByTestId('light-stops').boundingBox()
  // The stops run between the thumb's centres at either end, 9 px in.
  await page.mouse.click(b.x + 9 + ((b.width - 18) * i) / 5, b.y + b.height / 2)
  await page.mouse.move(5, 995)
}

/** Pick Auto, so the sun-following curve runs the light and the timeline shows the daylight window. */
async function pickAuto(page) {
  await pickStop(page, 0)
  await expect(page.getByTestId('auto-sub')).toContainText('follows sun')
}

// Home and Plan are WebP: the 3D tower's lit gradient bands as a palette PNG
// and is several times larger as a full-colour one.
const shots = [
  {
    route: '/',
    output: 'core-home.webp',
    source: 'route /, tower zoomed one step',
    prepare: zoomTower,
  },
  { route: '/light', output: 'core-light.png' },
  { route: '/water', output: 'core-water.png' },
  {
    route: '/light',
    output: 'core-schedule.png',
    source: 'route /light, scrolled to its curves',
    prepare: (page) =>
      page.getByRole('button', { name: 'Add curve' }).evaluate((el) => el.scrollIntoView()),
  },
  {
    route: '/light',
    output: 'core-light-auto.png',
    source: 'route /light, Auto picked on the slider',
    prepare: pickAuto,
  },
  {
    route: '/light',
    output: 'core-light-hold.png',
    source: 'route /light, Auto picked, then 50 on the slider (a hold)',
    prepare: async (page) => {
      await pickAuto(page)
      await pickStop(page, 3)
      await expect(page.getByTestId('hold-bar')).toContainText('holding 50% until')
    },
  },
  {
    route: '/light',
    output: 'core-light-sun.png',
    source: 'route /light, Auto picked and its curve open at the sun settings',
    prepare: async (page) => {
      await pickAuto(page)
      const edit = page.getByRole('button', { name: 'Edit Auto' })
      if (await edit.count()) await edit.click()
      await page
        .getByText('Extend the day')
        .first()
        .evaluate((el) => el.scrollIntoView({ block: 'center' }))
    },
  },
  { route: '/grow', output: 'core-grow.png' },
  { route: '/plan', output: 'core-plan.webp', source: 'route /plan, the 3D tower' },
  { route: '/autopilot', output: 'core-autopilot.png' },
  { route: '/analysis', output: 'core-analysis.png' },
  { route: '/status', output: 'core-status.png' },
  { route: '/sensors', output: 'core-sensors.png' },
  { route: '/cameras', output: 'core-cameras.png' },
  { route: '/alerts', output: 'core-alerts.png' },
  { route: '/settings', output: 'core-settings.png' },
  { route: '/kiosk', output: 'core-kiosk.png' },
]

// GPU WebGL for the 3D tower (Metal on a Mac). Set CAPTURE_GL for another
// backend, e.g. '--enable-unsafe-swiftshader --use-angle=swiftshader'.
const browser = await chromium.launch({
  args: (process.env.CAPTURE_GL ?? '--use-angle=metal --enable-gpu').split(' '),
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  reducedMotion: 'reduce',
  timezoneId: 'America/Los_Angeles',
})
await context.route('**/*', (r) =>
  r.request().url().startsWith(origin) ? r.continue() : r.abort(),
)
const page = await context.newPage()
await page.clock.install({ time: new Date(capturedTime) })
await mkdir('public/media', { recursive: true })
const assets = []
for (const { route, output, source, prepare } of shots) {
  await page.goto(origin + route)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  const tower = page.getByTestId('tower-3d')
  if (await tower.count())
    await expect(tower.first()).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
  await prepare?.(page)
  await page.waitForTimeout(2500)
  const file = `public/media/${output}`
  const b = await page.screenshot()
  const optimized = output.endsWith('.webp')
    ? await sharp(b).webp({ quality: 85, effort: 6 }).toBuffer()
    : await sharp(b).png({ compressionLevel: 9, palette: false }).toBuffer()
  await writeFile(file, optimized)
  const m = await sharp(optimized).metadata()
  assets.push({
    repository: 'seedypod/core',
    commit,
    source: `web demo build (VITE_DEMO=1), ${source ?? `route ${route}`}`,
    output,
    method: `scripts/capture-core.mjs (Playwright, 1440x1000 @2x, dark, GPU WebGL, clock ${capturedTime})`,
    sha256: createHash('sha256').update(optimized).digest('hex'),
    bytes: optimized.length,
    width: m.width,
    height: m.height,
  })
  console.log(`captured ${route} → ${output}`)
}
await browser.close()
server.close()
const manifest = JSON.parse(await readFile('capture/manifest.json', 'utf8'))
const kept = manifest.assets.filter(
  (a) => !a.output.startsWith('core-') || assets.some((n) => n.output === a.output),
)
const merged = kept.map((a) => assets.find((n) => n.output === a.output) ?? a)
for (const a of assets) if (!merged.includes(a)) merged.unshift(a)
await writeFile(
  'capture/manifest.json',
  JSON.stringify({ version: 1, assets: merged }, null, 2) + '\n',
)
