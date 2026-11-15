import { type Transaction, type State, money } from './types';
export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
export function summarize(transactions: Transaction[], month: string) {
  const rows = transactions.filter(
    (t) => t.date.startsWith(month) && !t.pending && t.category !== 'Transfer',
  );
  const income = rows.filter((t) => t.category === 'Income').reduce((s, t) => s + t.amount, 0);
  // Refunds offset spending; income and transfers never enter category spending.
  const byCategory: Record<string, number> = {};
  for (const t of rows.filter((t) => t.category !== 'Income'))
    byCategory[t.category] = (byCategory[t.category] || 0) - t.amount;
  const spending = Object.values(byCategory).reduce((a, b) => a + b, 0);
  return { income, spending, net: income - spending, byCategory, rows };
}
export function forecast(state: State, now = new Date()) {
  const current = summarize(state.transactions, monthKey(now));
  const day = now.getUTCDate();
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const liquid = state.accounts
    .filter((a) => a.type === 'checking')
    .reduce((s, a) => s + a.balance, 0);
  const daily = Math.max(0, current.spending) / day;
  // No unconfirmed future income is assumed. Credit and savings balances excluded.
  const remaining = Math.round(daily * (days - day));
  return {
    balance: liquid,
    projected: liquid - remaining,
    remaining,
    daily: Math.round(daily),
    daysLeft: days - day,
    low: liquid - Math.round(remaining * 1.25),
    high: liquid - Math.round(remaining * 0.75),
    assumptions: `Based on ${day} days of posted spending. Assumes the same daily spending rate, no future income, and checking balances only. Excludes pending transactions. Range uses ±25% spending sensitivity, not a statistical confidence interval.`,
  };
}
export function goalContribution(
  target: number,
  saved: number,
  deadline: string,
  now = new Date(),
) {
  const end = new Date(deadline + 'T00:00:00Z');
  const months = Math.max(
    1,
    (end.getUTCFullYear() - now.getUTCFullYear()) * 12 + end.getUTCMonth() - now.getUTCMonth(),
  );
  return Math.ceil(Math.max(0, target - saved) / months);
}
export const summaryEvidence = (state: State, month: string) => {
  const s = summarize(state.transactions, month);
  return [
    { label: 'Period', value: month },
    { label: 'Posted income', value: money(s.income) },
    { label: 'Net spending', value: money(s.spending) },
    { label: 'Included transactions', value: String(s.rows.length) },
  ];
};
