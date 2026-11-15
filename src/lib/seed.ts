import { randomUUID } from 'node:crypto';
import { type State, type Transaction } from './types';
export function seed(demo: boolean): Omit<State, 'user' | 'updatedAt' | 'assistantMode'> {
  if (!demo) return { accounts: [], transactions: [], budgets: [], goals: [] };
  const now = new Date();
  const transactions: Transaction[] = [];
  for (let offset = 0; offset < 6; offset++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const ym = date.toISOString().slice(0, 7);
    const add = (
      day: number,
      merchant: string,
      category: Transaction['category'],
      amount: number,
      account = 'Everyday Checking',
    ) => {
      if (offset === 0 && day > now.getUTCDate()) return;
      transactions.push({
        id: randomUUID(),
        date: `${ym}-${String(day).padStart(2, '0')}`,
        merchant,
        category,
        amount,
        account,
        pending: false,
      });
    };
    add(1, 'Acme Studio · Payroll', 'Income', 620000);
    add(2, 'Parkside Apartments', 'Housing', -185000);
    add(3, 'Whole Foods Market', 'Groceries', -12480);
    add(4, 'Blue Bottle Coffee', 'Dining', -650);
    add(5, 'Netflix', 'Entertainment', -1599);
    add(6, 'Shell', 'Transport', -5800);
    add(7, 'Trader Joe’s', 'Groceries', -8642);
    add(8, 'Sweetgreen', 'Dining', -1840);
    add(9, 'Internet & mobile', 'Utilities', -8900);
    add(10, 'Nike', 'Shopping', -(11500 + offset * 550));
    add(11, 'Spotify', 'Entertainment', -1199);
    add(12, 'CVS Pharmacy', 'Health', -2450);
    add(13, 'Neighborhood Kitchen', 'Dining', -7600);
    add(14, 'Trader Joe’s', 'Groceries', -9755);
    add(15, 'Savings transfer', 'Transfer', -80000);
    add(17, 'Metro Transit', 'Transport', -4200);
    add(20, 'Whole Foods Market', 'Groceries', -11250);
    add(22, 'Neighborhood Kitchen', 'Dining', -6200);
    add(25, 'Bookshop', 'Shopping', -3840);
    add(27, 'City Electric', 'Utilities', -7820);
  }
  return {
    accounts: [
      {
        id: randomUUID(),
        name: 'Everyday Checking',
        institution: 'Demo Bank',
        type: 'checking',
        balance: 824650,
        last4: '4829',
      },
      {
        id: randomUUID(),
        name: 'High-yield Savings',
        institution: 'Demo Bank',
        type: 'savings',
        balance: 1832000,
        last4: '9012',
      },
      {
        id: randomUUID(),
        name: 'Rewards Credit',
        institution: 'Demo Bank',
        type: 'credit',
        balance: -124580,
        last4: '3318',
      },
    ],
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    budgets: [
      { category: 'Housing', limit: 200000 },
      { category: 'Groceries', limit: 55000 },
      { category: 'Dining', limit: 25000 },
      { category: 'Shopping', limit: 20000 },
      { category: 'Transport', limit: 18000 },
      { category: 'Entertainment', limit: 8000 },
    ],
    goals: [
      {
        id: randomUUID(),
        name: 'Emergency fund',
        target: 2000000,
        saved: 1420000,
        deadline: `${now.getUTCFullYear() + 1}-06-01`,
      },
      {
        id: randomUUID(),
        name: 'Japan adventure',
        target: 500000,
        saved: 185000,
        deadline: `${now.getUTCFullYear() + 1}-09-01`,
      },
      {
        id: randomUUID(),
        name: 'A place of my own',
        target: 5000000,
        saved: 820000,
        deadline: `${now.getUTCFullYear() + 3}-01-01`,
      },
    ],
  };
}
