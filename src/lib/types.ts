export const categories = [
  'Housing',
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Utilities',
  'Income',
  'Transfer',
  'Other',
] as const;
export type Category = (typeof categories)[number];
export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  category: Category;
  amount: number;
  account: string;
  pending: boolean;
};
export type Account = {
  id: string;
  name: string;
  institution: string;
  type: 'checking' | 'savings' | 'credit';
  balance: number;
  last4: string;
};
export type Budget = { category: Category; limit: number };
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string };
export type State = {
  user: { name: string; email: string; demo: boolean };
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  updatedAt: string;
  assistantMode: string;
};
export type Evidence = { label: string; value: string };
export type Answer = {
  text: string;
  evidence: Evidence[];
  transactionIds: string[];
  asOf: string;
  mode: string;
};
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
