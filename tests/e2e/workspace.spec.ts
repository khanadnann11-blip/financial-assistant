import { test, expect } from '@playwright/test';
test('demo workspace supports the core financial workflows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the demo' }).click();
  await expect(page.getByRole('heading', { name: /Looking good, Alex/ })).toBeVisible();
  await page.getByRole('button', { name: 'Transactions', exact: true }).click();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Merchant or description').fill('Browser test coffee');
  await page.getByLabel('Amount (USD)', { exact: true }).fill('12.34');
  await page.getByLabel('Category', { exact: true }).selectOption('Dining');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('Browser test coffee');
  await expect(page.getByRole('table')).toContainText('Browser test coffee');
  await expect(page.getByRole('table')).toContainText('$12.34');
  await page.getByRole('button', { name: 'AI Assistant', exact: false }).first().click();
  await page
    .getByRole('textbox', { name: 'Ask your financial assistant' })
    .fill('What did I spend on dining this month?');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.locator('.message.assistant')).toContainText('posted transactions');
  await page.getByText('View supporting data').click();
  await expect(page.locator('.source-list')).toContainText('Browser test coffee');
  await page.getByRole('button', { name: 'Goals', exact: true }).click();
  await page.getByRole('button', { name: 'New goal', exact: true }).click();
  await page.getByLabel('Goal name').fill('My next chapter');
  await page.getByLabel('Target (USD)').fill('1000');
  await page.getByLabel('Already saved (USD)').fill('100');
  await page.getByLabel('Target date').fill('2028-06-01');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'My next chapter' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings & privacy' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export my data' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('financial-data.json');
});
test('API requires a session and rejects cross-origin writes', async ({ request }) => {
  expect((await request.get('/api/state')).status()).toBe(401);
  expect(
    (await request.post('/api/demo', { headers: { origin: 'https://attacker.example' } })).status(),
  ).toBe(403);
});
test('mobile demo has usable navigation and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the demo' }).click();
  await expect(page.getByRole('heading', { name: /Looking good/ })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A plan for your everyday.' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test('registered workspaces persist and reject another user’s record IDs', async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { origin: 'http://localhost:3000' },
  });
  const b = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { origin: 'http://localhost:3000' },
  });
  const email = `test-${Date.now()}@example.test`;
  const password = 'test-only-long-password';
  expect(
    (await a.post('/api/register', { data: { name: 'Private User', email, password } })).status(),
  ).toBe(200);
  expect((await b.post('/api/demo', { data: {} })).status()).toBe(200);
  expect((await a.get('/api/state')).ok()).toBeTruthy();
  const initial = await (await a.get('/api/state')).json();
  expect(initial.transactions).toHaveLength(0);
  const other = await (await b.get('/api/state')).json();
  expect(
    (await a.patch('/api/goals', { data: { id: other.goals[0].id, saved: 1 } })).status(),
  ).toBe(404);
  expect(
    (
      await a.post('/api/accounts', {
        data: {
          name: 'My checking',
          institution: 'Manual bank',
          type: 'checking',
          balance: 100000,
          last4: '1234',
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await a.post('/api/transactions', {
        data: {
          date: new Date().toISOString().slice(0, 10),
          merchant: 'My private expense',
          category: 'Dining',
          amount: -5000,
          account: 'My checking',
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await a.post('/api/budgets', { data: { category: 'Dining', limit: 20000 } })).status(),
  ).toBe(200);
  await a.post('/api/logout', { data: {} });
  expect((await a.get('/api/state')).status()).toBe(401);
  expect((await a.post('/api/login', { data: { email, password } })).status()).toBe(200);
  const restored = await (await a.get('/api/state')).json();
  expect(restored.transactions[0].merchant).toBe('My private expense');
  expect(restored.budgets[0].limit).toBe(20000);
  expect(
    (await (await b.get('/api/state')).json()).transactions.some(
      (t: { merchant: string }) => t.merchant === 'My private expense',
    ),
  ).toBeFalsy();
  expect((await a.delete('/api/me', { data: { confirmation: 'DELETE' } })).status()).toBe(200);
  expect((await a.get('/api/state')).status()).toBe(401);
  expect((await a.post('/api/login', { data: { email, password } })).status()).toBe(401);
  await a.dispose();
  await b.dispose();
});
