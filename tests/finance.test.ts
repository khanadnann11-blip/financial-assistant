import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, forecast, goalContribution } from '../src/lib/finance';
import { seed } from '../src/lib/seed';
import { answer } from '../src/lib/assistant';
import { type State, type Transaction } from '../src/lib/types';
const tx = (
  id: string,
  amount: number,
  category: Transaction['category'],
  pending = false,
  date = '2026-11-01',
): Transaction => ({
  id,
  amount,
  category,
  pending,
  date,
  merchant: 'Test merchant',
  account: 'Checking',
});
const state = (transactions: Transaction[] = []): State => ({
  ...seed(false),
  transactions,
  user: { name: 'Test', email: '', demo: false },
  updatedAt: '2026-11-15T12:00:00Z',
  assistantMode: 'local',
});
const now = new Date('2026-11-15T12:00:00Z');
test('refunds offset spending without becoming income; transfers, pending and other periods excluded', () => {
  const s = summarize(
    [
      tx('1', 500000, 'Income'),
      tx('2', -10000, 'Dining'),
      tx('3', 2500, 'Dining'),
      tx('4', -90000, 'Transfer'),
      tx('5', -20000, 'Shopping', true),
      tx('6', -1000, 'Dining', false, '2026-10-01'),
    ],
    '2026-11',
  );
  assert.equal(s.income, 500000);
  assert.equal(s.spending, 7500);
  assert.equal(s.net, 492500);
  assert.equal(s.byCategory.Dining, 7500);
});
test('integer cent arithmetic preserves small amounts', () => {
  assert.equal(
    summarize(
      Array.from({ length: 100 }, (_, i) => tx(String(i), -1, 'Dining')),
      '2026-11',
    ).spending,
    100,
  );
});
test('forecast uses checking snapshots only and no speculative income', () => {
  const s = state([tx('1', -15000, 'Dining')]);
  s.accounts = [
    {
      id: '1',
      name: 'Checking',
      institution: 'Bank',
      type: 'checking',
      balance: 100000,
      last4: '1234',
    },
    {
      id: '2',
      name: 'Savings',
      institution: 'Bank',
      type: 'savings',
      balance: 9999999,
      last4: '5678',
    },
  ];
  const f = forecast(s, now);
  assert.equal(f.daily, 1000);
  assert.equal(f.remaining, 15000);
  assert.equal(f.projected, 85000);
  assert.ok(f.low < f.projected && f.high > f.projected);
});
test('forecast has no remaining spending at month end', () => {
  const f = forecast(state([tx('1', -10000, 'Dining')]), new Date('2026-11-30T23:00:00Z'));
  assert.equal(f.daysLeft, 0);
  assert.equal(f.remaining, 0);
});
test('goal contributions round upward and completed goals require zero', () => {
  assert.equal(goalContribution(10000, 1, '2027-02-01', now), 3333);
  assert.equal(goalContribution(10000, 11000, '2027-02-01', now), 0);
});
test('assistant cites exact source transactions and respects last-month selection', async () => {
  const s = state([tx('1', -12345, 'Dining'), tx('2', -7000, 'Dining', false, '2026-10-01')]);
  const a = await answer('What did I spend on dining last month?', s, now);
  assert.match(a.text, /\$70\.00/);
  assert.deepEqual(a.transactionIds, ['2']);
  assert.equal(a.evidence[0].value, '2026-10');
});
test('assistant clarifies unsupported date windows instead of silently using current month', async () => {
  const a = await answer('What did I spend last year?', state(), now);
  assert.match(a.text, /one month/);
  assert.deepEqual(a.transactionIds, []);
});
test('assistant does not claim an empty workspace has complete financial coverage', async () => {
  const a = await answer('What did I spend?', state(), now);
  assert.match(a.text, /outside this workspace/);
});
test('assistant does not attempt financial actions', async () => {
  const a = await answer('Buy bitcoin using my checking account', state(), now);
  assert.match(a.text, /not supported/);
});
test('demo dates never include future transactions', () => {
  assert.ok(seed(true).transactions.every((t) => t.date <= new Date().toISOString().slice(0, 10)));
});

test('income corrections retain their sign', () => {
  const s = summarize([tx('1', 500000, 'Income'), tx('2', -10000, 'Income')], '2026-11');
  assert.equal(s.income, 490000);
  assert.equal(s.spending, 0);
});
test('comparison with last month compares current and preceding periods', async () => {
  const s = state([tx('1', -12345, 'Dining'), tx('2', -7000, 'Dining', false, '2026-10-01')]);
  const a = await answer('Compare spending with last month', s, now);
  assert.match(a.text, /\$123\.45/);
  assert.match(a.text, /\$53\.45 higher/);
});
test('historical forecast requests are clarified', async () => {
  const a = await answer('Forecast 2026-10', state(), now);
  assert.match(a.text, /current month only/);
});
test('malformed model routing falls back to deterministic local answers', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: '{"intent":"run_arbitrary_sql"}' } }] }),
      { status: 200 },
    );
  try {
    const a = await answer('What did I spend on dining?', state([tx('1', -12345, 'Dining')]), now);
    assert.match(a.text, /\$123\.45/);
    assert.match(a.mode, /unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
