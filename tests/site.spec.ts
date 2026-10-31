import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
function routes(dir = 'content', prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? routes(path.join(dir, e.name), prefix + '/' + e.name)
      : e.name.endsWith('.mdx')
        ? [prefix + (e.name === 'index.mdx' ? '' : '/' + e.name.replace('.mdx', '')) + '/']
        : [],
  )
}
const pages = ['/', ...routes()]
for (const route of pages)
  test(`renders ${route}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    const images = page.locator('img').filter({ visible: true })
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded()
      await expect(image).toHaveJSProperty('complete', true)
      expect(await image.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0)
    }
    expect(errors).toEqual([])
  })
test('all internal links and fragments resolve', async ({ page, request }) => {
  test.setTimeout(120000)
  const links = new Set<string>()
  for (const route of pages) {
    await page.goto(route)
    for (const h of await page
      .locator('a[href]')
      .evaluateAll((es) => es.map((e) => (e as HTMLAnchorElement).getAttribute('href')!))) {
      if (h.startsWith('/') && !h.startsWith('//')) links.add(h)
      else if (h.startsWith('#')) links.add(route + h)
    }
  }
  for (const href of links) {
    const [p, fragment] = href.split('#')
    const response = await request.get(p)
    expect(response.status(), href).toBe(200)
    if (fragment) {
      await page.goto(href)
      expect(
        await page.evaluate((id) => !!document.getElementById(decodeURIComponent(id)), fragment),
        href,
      ).toBe(true)
    }
  }
})
test('homepage navigation and keyboard access', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByText('Skip to content')).toBeFocused()
  await page.getByRole('link', { name: 'Get started', exact: false }).first().click()
  await expect(page.locator('h1')).toHaveText('Get started')
})
test('pre-hardware status is visible on the homepage and in the docs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('note')).toContainText('nothing has run on a real Gardyn yet')
  await page.goto('/getting-started/')
  await expect(
    page.getByText('Pre-hardware: nothing has run on a real Gardyn yet').first(),
  ).toBeVisible()
})
test('search finds an indexed guide', async ({ page }) => {
  await page.goto('/getting-started/')
  if (await page.getByRole('button', { name: 'Menu', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const input = page.getByRole('combobox').filter({ visible: true })
  await input.fill('Lovelace')
  const hit = page
    .locator('a[href*="/core/home-assistant/"]')
    .filter({ visible: true })
    .filter({ hasText: /Lovelace/i })
    .first()
  await expect(hit).toBeVisible({ timeout: 15000 })
  await hit.click()
  await expect(page).toHaveURL(/core\/home-assistant/)
})
test('docs sidebar navigation works', async ({ page }) => {
  await page.goto('/getting-started/')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('link', { name: 'Install', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL(/core\/installation/)
  await expect(page.locator('h1')).toHaveText('Install seedypod on a Gardyn')
})
test('URLs linked from the core README and API resolve', async ({ request }) => {
  for (const url of [
    '/getting-started/',
    '/core/',
    '/developers/',
    '/developers/api',
    '/developers/api/',
  ])
    expect((await request.get(url)).status(), url).toBe(200)
})
test('API reference renders every OpenAPI operation', async ({ page }) => {
  const spec = JSON.parse(readFileSync('public/openapi.json', 'utf8'))
  const count = Object.values(spec.paths).flatMap((p) => Object.keys(p as object)).length
  await page.goto('/developers/api/')
  await expect(page.locator('details.api-op')).toHaveCount(count)
  const runOnce = page.locator('details#pump-runOnce')
  await runOnce.locator('summary').click()
  await expect(runOnce).toContainText('durationS')
})
test('all ADRs are listed in the sidebar', async ({ page }) => {
  await page.goto('/developers/adr/')
  const adrs = readdirSync('content/developers/adr').filter((f) => /^\d{4}-/.test(f))
  expect(adrs.length).toBeGreaterThan(0)
  for (const f of adrs) {
    const href = `/developers/adr/${f.replace('.mdx', '')}/`
    await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(1)
  }
})
test('custom 404 export exists', async ({ request }) => {
  const response = await request.get('/this-page-does-not-exist/')
  expect(response.status()).toBe(404)
})
test('web UI screenshot enlarges and closes', async ({ page }) => {
  await page.goto('/core/')
  const name =
    'seedypod home screen with grow light, water tank level, pump state and environment readings'
  const image = page.getByRole('img', { name })
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveJSProperty('complete', true)
  // Nextra adds this control only after the image and zoom handler are ready.
  await expect(
    page.getByRole('button', { name: `Expand image: ${name}`, exact: true }),
  ).toBeAttached()
  await image.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('img')).toHaveJSProperty('naturalWidth', 2880)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('docs theme preference persists', async ({ page }) => {
  await page.goto('/getting-started/')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page.getByTitle('Change theme').filter({ visible: true }).first().click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/light/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/light/)
})
for (const [route, count] of [['/developers/architecture/', 1]] as const) {
  test(`Mermaid diagrams render accessibly on ${route}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(route)
    const diagrams = page.locator('.docs-diagram')
    await expect(diagrams).toHaveCount(count, { timeout: 30000 })
    for (const diagram of await diagrams.all()) {
      await diagram.scrollIntoViewIfNeeded()
      await expect(diagram.locator('svg')).toBeVisible({ timeout: 30000 })
      await expect(diagram.locator('title')).not.toBeEmpty()
      await expect(diagram.locator('desc')).not.toBeEmpty()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    expect(errors).toEqual([])
  })
}
