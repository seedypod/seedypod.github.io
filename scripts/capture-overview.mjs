// Record the scenes of the overview video from a demo build of seedypod/core.
//
//   cd <core checkout at CORE_COMMIT>
//   VITE_DEMO=1 npx vite build --config web/vite.config.ts --outDir /tmp/seedypod-demo
//   DEMO_DIST=/tmp/seedypod-demo CORE_COMMIT=<sha> node scripts/capture-overview.mjs
//   node scripts/render-overview.mjs
//
// The demo build is the real UI against the in-browser simulated tower, served
// on loopback; every request off that origin is blocked. Each scene is one
// Playwright video recording with real pointer and keyboard input, on a fixed
// clock at midday so the grow light is on. Writes .capture/overview/.
import { createServer } from 'node:http'
import { readFile, writeFile, stat, mkdir, rm } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium, expect } from '@playwright/test'

const root = resolve(process.env.DEMO_DIST ?? '')
const commit = process.env.CORE_COMMIT
if (!process.env.DEMO_DIST || !/^[a-f0-9]{40}$/.test(commit ?? ''))
  throw new Error('Set DEMO_DIST and CORE_COMMIT (a full sha)')
const dir = '.capture/overview'
const capturedTime = '2026-11-01T19:30:00Z'

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
await new Promise((r) => server.listen(4182, '127.0.0.1', r))
const origin = 'http://127.0.0.1:4182'

await rm(dir, { recursive: true, force: true })
await mkdir(dir, { recursive: true })
// GPU WebGL (Metal on a Mac): with software rendering every 3D frame takes about
// 250 ms and the tower turns at 4 fps. Set CAPTURE_GL for another backend, e.g.
// '--enable-unsafe-swiftshader --use-angle=swiftshader' on a machine without a GPU.
const browser = await chromium.launch({
  args: (process.env.CAPTURE_GL ?? '--use-angle=metal --enable-gpu').split(' '),
})
const clips = []
const errors = []

/** Records `act` on `path`; `ready` runs first, off the clip, so loading isn't in the video. */
async function record(scene, path, act, ready) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'dark',
    timezoneId: 'America/Los_Angeles',
    recordVideo: { dir: dir + '/raw', size: { width: 1440, height: 1000 } },
  })
  await context.route('**/*', (r) =>
    r.request().url().startsWith(origin) ? r.continue() : r.abort(),
  )
  await context.addInitScript(() => localStorage.setItem('seedypod.growView', 'pods'))
  const started = Date.now()
  const page = await context.newPage()
  await page.clock.install({ time: new Date(capturedTime) })
  page.on('pageerror', (e) => errors.push(`${scene}: ${e.message}`))
  await page.goto(origin + path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await ready?.(page)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${dir}/${scene}-start.png` })
  const start = (Date.now() - started) / 1000
  const verified = (await act(page)) ?? {}
  const duration = (Date.now() - started) / 1000 - start
  await page.screenshot({ path: `${dir}/${scene}-end.png` })
  const file = await page.video().path()
  await context.close()
  clips.push({ scene, path, file, start, duration, ...verified })
  console.log('recorded', scene, duration.toFixed(1), 's')
}

/** A slow, visible pointer move to the centre of a locator. */
async function point(page, locator, steps = 24) {
  await locator.scrollIntoViewIfNeeded()
  const b = await locator.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps })
}

const towerReady = (page) =>
  expect(page.getByTestId('tower-3d')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })

try {
  await record(
    'tower',
    '/',
    async (page) => {
      const tower = page.getByTestId('tower-3d')
      const b = await tower.boundingBox()
      const y = b.y + b.height * 0.45
      await page.mouse.move(b.x + b.width * 0.5, y, { steps: 10 })
      await page.mouse.down()
      await page.mouse.move(b.x + b.width * 0.62, y, { steps: 40 })
      await page.mouse.move(b.x + b.width * 0.42, y, { steps: 60 })
      await page.mouse.move(b.x + b.width * 0.5, y, { steps: 30 })
      await page.mouse.up()
      // Let the turn ease out, so the flag holds still for the click.
      await page.waitForTimeout(1600)
      const flag = tower.getByRole('button', { name: /: Needs attention$/ }).first()
      await point(page, flag)
      // The flag tracks its pod every frame, so Playwright never sees it "stable"; click where the pointer is.
      const at = await flag.boundingBox()
      await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2)
      await expect(tower.getByTestId('pod-callout')).toHaveAttribute('data-state', 'pinned')
      await page.waitForTimeout(3200)
      return { verified: 'tower turned; flagged pod pinned' }
    },
    towerReady,
  )

  await record(
    'zones',
    '/',
    async (page) => {
      const tower = page.getByTestId('tower-3d')
      const toggle = tower.getByRole('button', { name: 'Light zones' })
      await point(page, toggle)
      await toggle.click()
      await expect(tower.getByTestId('zone-legend')).toContainText('Gardyn Home')
      await page.waitForTimeout(5000)
      return { verified: 'light zones on, Gardyn Home legend' }
    },
    towerReady,
  )

  await record('grow', '/grow', async (page) => {
    const main = page.getByRole('main')
    const pod = main.getByRole('button', { name: '7 Genovese Basil' })
    await point(page, pod)
    await pod.click()
    const panel = main.getByRole('complementary', { name: 'Pod 7' })
    await expect(panel.getByTestId('placement-advice')).toContainText('grows best in medium light')
    await page.waitForTimeout(1800)
    const stage = panel.getByRole('slider', { name: 'Growth stage' })
    await point(page, stage)
    await stage.focus()
    await page.keyboard.press('Home')
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1300)
      await page.keyboard.press('ArrowRight')
    }
    await expect(stage).toHaveAttribute('aria-valuetext', /harvest/)
    await page.waitForTimeout(2200)
    return { verified: 'pod 7 picked; placement advice shown; stages scrubbed to harvest' }
  })

  await record('light', '/light', async (page) => {
    const main = page.getByRole('main')
    const level = main.getByRole('slider').first()
    await point(page, level)
    await level.focus()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('PageUp')
      await page.waitForTimeout(250)
    }
    await page.waitForTimeout(1500)
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(2200)
    return { verified: 'light level raised by keyboard; curve setpoints shown' }
  })

  await record('water', '/water', async (page) => {
    const main = page.getByRole('main')
    // The demo build doesn't run the simulated pump, so the scene picks a run length without starting one.
    const minute = main.getByRole('tab', { name: '1 min', exact: true })
    await point(page, minute)
    await minute.click()
    await page.waitForTimeout(1200)
    await point(page, main.getByRole('button', { name: /Run pump/ }))
    await page.waitForTimeout(1200)
    const month = main.getByRole('tab', { name: '30d', exact: true })
    await point(page, month)
    await month.click()
    await page.waitForTimeout(2600)
    return { verified: '1 min run length picked; tank history switched to 30 days' }
  })

  await record('autopilot', '/autopilot', async (page) => {
    await page.waitForTimeout(1500)
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 160)
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(2200)
  })

  await record('status', '/status', async (page) => {
    await expect(page.getByRole('main')).toContainText('LIVE')
    await page.waitForTimeout(3000)
    await page.mouse.wheel(0, 380)
    await page.waitForTimeout(2800)
  })
} finally {
  await browser.close()
  server.close()
  await writeFile(
    dir + '/capture.json',
    JSON.stringify(
      {
        sourceCommit: commit,
        capturedTime,
        method:
          'scripts/capture-overview.mjs; core web demo build (VITE_DEMO=1) with the in-browser simulated tower; loopback only, off-origin requests blocked; Playwright 1440x1000 video, dark, GPU WebGL',
        clips,
        errors,
      },
      null,
      2,
    ) + '\n',
  )
}
if (errors.length) throw new Error('Browser errors:\n' + errors.join('\n'))
console.log('recorded', clips.length, 'scenes')
