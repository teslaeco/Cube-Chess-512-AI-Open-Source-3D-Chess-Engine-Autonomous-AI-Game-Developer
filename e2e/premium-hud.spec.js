import { test, expect } from '@playwright/test'

// Real built 3D game, no remote API. Use a synthetic profile label only to
// exercise the signed-in HUD geometry; this is NOT an authentication test.
test('premium HUD keeps profile, exit, status and controls apart', async ({ page }, testInfo) => {
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname
    return host === 'localhost' || host === '127.0.0.1' ? route.continue() : route.abort()
  })
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-auth="guest"]').click()
  await expect(page.getByTestId('start-game')).toBeVisible()
  await page.getByTestId('start-game').click()
  await expect(page.getByTestId('return-to-menu')).toBeVisible()
  await expect(page.locator('.game-canvas')).toBeVisible()
  await page.evaluate(() => {
    const profile = document.querySelector('.game-header .user-profile-menu')
    if (!profile) throw new Error('Player account was not anchored in game header')
    profile.hidden = false
    profile.querySelector('[data-profile-name]').textContent = 'Guest layout preview'
  })
  const p = await page.evaluate(() => {
    const box = selector => {
      const element = document.querySelector(selector)
      if (!element) throw new Error('Missing HUD control: ' + selector)
      const r = element.getBoundingClientRect()
      return { x: r.left, y: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
    }
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth },
      header: box('.game-header'),
      brand: box('.brand-lockup'),
      turn: box('.turn-indicator'),
      actions: box('.header-actions'),
      exit: box('[data-testid="return-to-menu"]'),
      account: box('.user-profile-trigger'),
      status: box('.game-status-card'),
      level: box('.level-dock'),
      controls: box('.control-dock'),
      accountInHeader: document.querySelector('.game-header').contains(document.querySelector('.user-profile-menu')),
      turnDisplay: getComputedStyle(document.querySelector('.turn-indicator')).display,
      buttons: [...document.querySelectorAll('.control-dock button')].map(b => b.getBoundingClientRect().height),
    }
  })
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y))
  expect(p.accountInHeader).toBe(true)
  expect(p.viewport.scrollWidth).toBeLessThanOrEqual(p.viewport.width + 2)
  expect(p.turnDisplay).not.toBe('none')
  expect(overlap(p.exit, p.account), 'exit and account must not overlap').toBeLessThan(1)
  expect(overlap(p.brand, p.account), 'brand and account must not overlap').toBeLessThan(1)
  expect(overlap(p.controls, p.level), 'camera toolbar and level selector must not overlap').toBeLessThan(1)
  expect(p.exit.x).toBeGreaterThanOrEqual(0)
  expect(p.exit.right).toBeLessThanOrEqual(p.viewport.width + 1)
  expect(p.exit.height).toBeGreaterThanOrEqual(32)
  expect(p.account.right).toBeLessThanOrEqual(p.viewport.width + 1)
  expect(p.header.bottom + 2).toBeLessThanOrEqual(p.status.y)
  expect(p.controls.bottom).toBeLessThan(p.viewport.height - 32)
  expect(p.buttons.every(n => n >= 40)).toBe(true)
  if (testInfo.project.name === 'mobile-chrome') {
    expect(p.header.height).toBeLessThanOrEqual(120)
    expect(p.status.width).toBeLessThanOrEqual(160)
    expect(p.level.width).toBeLessThanOrEqual(85)
    expect(p.controls.height).toBeLessThanOrEqual(66)
  }
  // Both buttons remain functional; a cancelled exit keeps this document.
  const marker = 'premium-layout-same-document'
  await page.evaluate(value => { window.__premiumLayoutSentinel = value }, marker)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByTestId('return-to-menu').click()
  expect(await page.evaluate(() => window.__premiumLayoutSentinel)).toBe(marker)
  await expect(page.getByTestId('return-to-menu')).toBeVisible()
})
