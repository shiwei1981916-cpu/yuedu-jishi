const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:8123';
const FILE = BASE + '/' + encodeURIComponent('阅读基石.html');
const LS_KEY = 'reading_base_v1';
const DIR = __dirname;
const fx = (n) => path.join(DIR, 'fixtures', n);

function writeFixture(name, obj) {
  const d = path.join(DIR, 'fixtures');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  const p = path.join(d, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

async function openFirstDetail(page) {
  await page.locator('.tile', { hasText: '三年级' }).first().click();
  await page.locator('.tile', { hasText: '上册' }).first().click();
  await page.locator('.ucard').first().click();
}

test.beforeAll(() => {
  // 合法备份（带回填数据）
  writeFixture('withdata.json', {
    version: '1.0.0',
    notes: { '三年级上册|第一单元': '你好世界' },
    stars: { '三年级上册|第一单元': true },
  });
  // 合法空备份
  writeFixture('valid.json', { version: '1.0.0', notes: {}, stars: {} });
  // 畸形备份（notes/stars 非对象）
  writeFixture('invalid.json', { notes: 1, stars: 2 });
});

test.beforeEach(async ({ page }) => {
  // 注入「已同意」标记，避免首启告知覆盖层拦截既有回归用例的点击
  await page.addInitScript(() => { try { localStorage.setItem('yljs_agreed', '1'); } catch (e) {} });
  await page.goto(FILE);
  await page.evaluate((k) => localStorage.removeItem(k), LS_KEY);
  await page.reload();
});

// ---------- R2 导出兜底 ----------
test('R2-1 导出-剪贴板兜底', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      configurable: true,
    });
  });
  await page.goto(FILE);
  await page.getByText('导出备份').first().click();
  await expect(page.locator('#toast')).toHaveText(/已复制到剪贴板/, { timeout: 3000 });
});

test('R2-2 导出-系统分享', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
    window.__shareCalled = false;
    Object.defineProperty(navigator, 'share', {
      value: () => { window.__shareCalled = true; return Promise.resolve(); },
      configurable: true,
    });
  });
  await page.goto(FILE);
  await page.getByText('导出备份').first().click();
  await expect.poll(() => page.evaluate(() => window.__shareCalled)).toBeTruthy();
  await expect(page.locator('#toast')).toHaveText(/已分享备份/, { timeout: 3000 });
});

test('R2-3 导出-下载路径不报错', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  await page.goto(FILE);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('导出备份').first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/阅读基石备份/);
});

// ---------- R3 导入确认 ----------
test('R3-1 导入-拒绝不改写', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ notes: { a: 'orig' }, stars: {} })), LS_KEY);
  await page.reload();
  page.on('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: /我的成长树/ }).click();
  await page.locator('#impFile').setInputFiles(fx('withdata.json'));
  await page.waitForTimeout(400);
  const ls = await page.evaluate((k) => localStorage.getItem(k), LS_KEY);
  expect(ls).toContain('orig');
  expect(ls).not.toContain('你好世界');
});

test('R3-2 导入-确认后覆盖', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ notes: { a: 'orig' }, stars: {} })), LS_KEY);
  await page.reload();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /我的成长树/ }).click();
  await page.locator('#impFile').setInputFiles(fx('withdata.json'));
  await page.waitForTimeout(400);
  const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LS_KEY);
  expect(after.notes['三年级上册|第一单元']).toBe('你好世界');
  expect(after.notes.a).toBeUndefined();
});

// ---------- R4 笔记不丢 ----------
test('R4-1 笔记-防抖自动保存', async ({ page }) => {
  await openFirstDetail(page);
  await page.locator('#dNote').fill('我的小发现');
  await page.waitForTimeout(900);
  const ls = await page.evaluate((k) => localStorage.getItem(k), LS_KEY);
  expect(ls).toContain('我的小发现');
});

test('R4-2 笔记-blur 立即落盘', async ({ page }) => {
  await openFirstDetail(page);
  const ta = page.locator('#dNote');
  await ta.fill('blur测试');
  await ta.blur();
  await page.waitForTimeout(150);
  const ls = await page.evaluate((k) => localStorage.getItem(k), LS_KEY);
  expect(ls).toContain('blur测试');
});

// ---------- R6 导入校验 ----------
test('R6-1 导入-畸形被拒且原数据不被污染', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ notes: { x: 'keep' }, stars: {} })), LS_KEY);
  await page.reload();
  page.on('dialog', () => { throw new Error('不应出现确认弹窗'); });
  await page.getByRole('button', { name: /我的成长树/ }).click();
  await page.locator('#impFile').setInputFiles(fx('invalid.json'));
  await page.waitForTimeout(300);
  await expect(page.locator('#toast')).toHaveText(/备份格式不对/, { timeout: 3000 });
  const ls = await page.evaluate((k) => localStorage.getItem(k), LS_KEY);
  expect(ls).toContain('keep');
});

test('R6-2 导入-合法备份成功', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ notes: { p: 'old' }, stars: {} })), LS_KEY);
  await page.reload();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /我的成长树/ }).click();
  await page.locator('#impFile').setInputFiles(fx('valid.json'));
  await page.waitForTimeout(300);
  const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LS_KEY);
  expect(after).toEqual({ notes: {}, stars: {} });
});

// ---------- R7 配额异常 ----------
test('R7 配额异常-不崩溃且写入失败被捕获', async ({ page }) => {
  await page.goto(FILE);
  // 强制 localStorage.setItem 抛配额异常（更可靠地覆盖实例方法）
  await page.evaluate(() => {
    const ls = window.localStorage;
    ls.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); };
  });
  await openFirstDetail(page);
  await page.locator('#starBtn').click();
  await page.waitForTimeout(200);
  // 配额异常 -> save() 被 try/catch 捕获，不应抛未捕获异常导致页面崩溃（详情页星按钮仍可见即证明未崩）
  expect(await page.locator('#starBtn').isVisible()).toBeTruthy();
  // 且无数据被写入（证明 setItem 确实抛错并被吞掉，而非静默成功）
  const ls = await page.evaluate((k) => localStorage.getItem(k), LS_KEY);
  expect(ls).toBeNull();
});

// ---------- R8 可访问性 ----------
test('R8 可访问性-视口/字号/对比度', async ({ page }) => {
  const meta = await page.getAttribute('meta[name=viewport]', 'content');
  expect(meta).not.toContain('user-scalable=no');
  expect(meta).not.toContain('maximum-scale');

  const smFs = await page.locator('.tile .sm').first().evaluate((el) => getComputedStyle(el).fontSize);
  expect(smFs).toBe('14px');

  const labFs = await page.locator('.lab').first().evaluate((el) => getComputedStyle(el).fontSize);
  expect(labFs).toBe('13px');

  const contrast = await page.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();
    const m = v.match(/^#([0-9a-f]{6})$/i);
    const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return 1.05 / (L + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

// ---------- R7-RES 配额异常-假成功已修复（fe-lead 补的专门断言）----------
test('R7-RES-1 配额异常-错误提示且不假成功', async ({ page }) => {
  await page.goto(FILE);
  // 强制 localStorage.setItem 抛配额异常
  await page.evaluate(() => {
    const ls = window.localStorage;
    ls.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); };
  });
  await openFirstDetail(page);
  await page.locator('#starBtn').click();
  await page.waitForTimeout(200);
  const toastText = await page.locator('#toast').textContent();
  // 断言①：提示存储空间不足，且不出现成功鼓励文案
  expect(toastText).toContain('存储空间不足');
  expect(toastText).not.toContain('这个本领被你拿下啦');
  expect(toastText).not.toContain('拿下啦');
  // 断言②：星星显示为未点亮 ☆（内存态已回滚，与持久化一致）
  const starState = (await page.locator('#starState').textContent()).trim();
  expect(starState).toBe('☆');
  // 断言③：localStorage 根本未写入（等价于刷新后星消失）
  const ls = await page.evaluate((k) => localStorage.getItem(k), LS_KEY);
  expect(ls).toBeNull();
});

test('R7-RES-2 配额正常-成功点亮并持久化（回归）', async ({ page }) => {
  await page.goto(FILE);
  await page.evaluate(() => { window.rnd = (a) => a[0]; }); // 固定鼓励文案，消除随机性
  await openFirstDetail(page);
  await page.locator('#starBtn').click();
  await page.waitForTimeout(200);
  const toastText = await page.locator('#toast').textContent();
  // 成功鼓励文案出现（PRAISE[0] = '啪嗒！这颗星亮啦，你真棒～'），无错误提示
  expect(toastText).toContain('这颗星亮啦');
  expect(toastText).not.toContain('存储空间不足');
  // 星星点亮 ★
  const starState = (await page.locator('#starState').textContent()).trim();
  expect(starState).toBe('★');
  // localStorage 已写入该单元 stars 键
  const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LS_KEY);
  expect(after.stars['三年级上册|第一单元']).toBe(true);
});

// ---------- 合规-首启告知（P0 未成年人保护）----------
test('合规-首启告知出现并可关闭', async ({ context }) => {
  // 全新页面（不注入 yljs_agreed），模拟首次打开
  const p = await context.newPage();
  await p.goto(FILE);
  await expect(p.locator('#agreeOverlay')).toBeVisible();
  await p.getByRole('button', { name: /我明白了，开始阅读/ }).click();
  await expect(p.locator('#agreeOverlay')).toBeHidden();
  expect(await p.evaluate(() => localStorage.getItem('yljs_agreed'))).toBe('1');
  // 刷新后不再出现
  await p.reload();
  await expect(p.locator('#agreeOverlay')).toBeHidden();
  await p.close();
});
