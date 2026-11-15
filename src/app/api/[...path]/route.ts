import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { categories } from '@/lib/types';
import {
  allow,
  cleanup,
  createUser,
  deleteUser,
  getState,
  login,
  newSession,
  revoke,
  updateState,
  userFor,
} from '@/lib/store';
import { answer } from '@/lib/assistant';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cents = z.number().int().min(-100_000_000_000).max(100_000_000_000);
const positive = cents.refine((n) => n > 0, 'Must be greater than zero');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Invalid date',
  );
const credentials = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});
const transaction = z.object({
  date: date.refine(
    (s) => s <= new Date().toISOString().slice(0, 10),
    'Future transactions are not supported',
  ),
  merchant: z.string().trim().min(1).max(120),
  category: z.enum(categories),
  amount: cents.refine((n) => n !== 0),
  account: z.string().max(80),
  pending: z.boolean().default(false),
});
const account = z.object({
  name: z.string().trim().min(1).max(80),
  institution: z.string().trim().min(1).max(80),
  type: z.enum(['checking', 'savings', 'credit']),
  balance: cents,
  last4: z.string().regex(/^\d{4}$/),
});
const goal = z.object({
  name: z.string().trim().min(1).max(80),
  target: positive,
  saved: cents.refine((n) => n >= 0),
  deadline: date,
});
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function sessionResponse(id: string) {
  const res = json({ ok: true });
  res.cookies.set('session', newSession(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  });
  return res;
}
function clearSession(res: NextResponse) {
  res.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
async function readBody(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError('Missing body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) {
      await reader.cancel();
      throw new RangeError('Request too large');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  const token = req.cookies.get('session')?.value;
  try {
    if (req.method !== 'GET') {
      const origin = req.headers.get('origin');
      const expected =
        process.env.APP_ORIGIN || `${new URL(req.url).protocol}//${req.headers.get('host')}`;
      if (!origin || origin !== expected) return json({ error: 'Invalid request origin' }, 403);
      if (Number(req.headers.get('content-length') || 0) > 32768)
        return json({ error: 'Request too large' }, 413);
    }
    if (req.method === 'POST' && ['demo', 'register', 'login'].includes(path)) {
      // Deployment proxy must overwrite forwarding headers; see deployment guide.
      const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
      if (!allow(`auth:${client}`, 20, 900000))
        return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
      cleanup();
      if (path === 'demo') return sessionResponse(createUser('Alex Morgan', null, null, true));
      const c = credentials.parse(await readBody(req));
      if (path === 'login') {
        const id = login(c.email, c.password);
        return id ? sessionResponse(id) : json({ error: 'Email or password is incorrect.' }, 401);
      }
      if (!c.name) return json({ error: 'Your name is required.' }, 400);
      try {
        return sessionResponse(createUser(c.name, c.email, c.password, false));
      } catch (e) {
        if (String(e).includes('UNIQUE'))
          return json({ error: 'Unable to create this account. Try signing in.' }, 409);
        throw e;
      }
    }
    const id = userFor(token);
    if (!id) return json({ error: 'Please sign in to continue.' }, 401);
    if (!allow(`user:${id}`, 180, 60000))
      return json({ error: 'Too many requests. Please wait a minute.' }, 429);
    if (req.method === 'GET') {
      if (path === 'state') return json(getState(id));
      if (path === 'export') {
        return new NextResponse(JSON.stringify(getState(id), null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="financial-data.json"',
            'Cache-Control': 'no-store',
          },
        });
      }
    }
    if (req.method === 'POST') {
      if (path === 'logout') {
        if (token) revoke(token);
        return clearSession(json({ ok: true }));
      }
      if (path === 'assistant') {
        if (!allow(`assistant:${id}`, 15, 60000))
          return json({ error: 'Please wait a minute before asking more questions.' }, 429);
        const { question } = z
          .object({ question: z.string().trim().min(1).max(1000) })
          .parse(await readBody(req));
        return json(await answer(question, getState(id)));
      }
      if (path === 'transactions') {
        const t = transaction.parse(await readBody(req));
        if (!getState(id).accounts.some((a) => a.name === t.account))
          return json({ error: 'Choose an existing account.' }, 400);
        updateState(id, (s) => {
          s.transactions.unshift({ ...t, id: randomUUID() });
          s.transactions.sort((a, b) => b.date.localeCompare(a.date));
        });
        return json({ ok: true });
      }
      if (path === 'accounts') {
        const a = account.parse(await readBody(req));
        if (getState(id).accounts.some((item) => item.name === a.name))
          return json({ error: 'Use a unique account name.' }, 400);
        updateState(id, (s) => s.accounts.push({ ...a, id: randomUUID() }));
        return json({ ok: true });
      }
      if (path === 'budgets') {
        const b = z
          .object({
            category: z.enum(categories).refine((c) => !['Income', 'Transfer'].includes(c)),
            limit: positive,
          })
          .parse(await readBody(req));
        updateState(id, (s) => {
          s.budgets = [...s.budgets.filter((item) => item.category !== b.category), b];
        });
        return json({ ok: true });
      }
      if (path === 'goals') {
        const g = goal.parse(await readBody(req));
        updateState(id, (s) => s.goals.push({ ...g, id: randomUUID() }));
        return json({ ok: true });
      }
    }
    if (req.method === 'PATCH') {
      const body = await readBody(req);
      if (path === 'transactions') {
        const p = z.object({ id: z.string().uuid(), category: z.enum(categories) }).parse(body);
        if (!getState(id).transactions.some((t) => t.id === p.id))
          return json({ error: 'Transaction not found.' }, 404);
        updateState(id, (s) => {
          s.transactions.find((t) => t.id === p.id)!.category = p.category;
        });
        return json({ ok: true });
      }
      if (path === 'goals') {
        const g = z
          .object({ id: z.string().uuid(), saved: cents.refine((n) => n >= 0) })
          .parse(body);
        if (!getState(id).goals.some((t) => t.id === g.id))
          return json({ error: 'Goal not found.' }, 404);
        updateState(id, (s) => {
          s.goals.find((t) => t.id === g.id)!.saved = g.saved;
        });
        return json({ ok: true });
      }
      if (path === 'accounts') {
        const a = z.object({ id: z.string().uuid(), balance: cents }).parse(body);
        if (!getState(id).accounts.some((t) => t.id === a.id))
          return json({ error: 'Account not found.' }, 404);
        updateState(id, (s) => {
          s.accounts.find((t) => t.id === a.id)!.balance = a.balance;
        });
        return json({ ok: true });
      }
    }
    if (req.method === 'DELETE') {
      if (path === 'me') {
        const body = z.object({ confirmation: z.literal('DELETE') }).parse(await readBody(req));
        if (body.confirmation) deleteUser(id);
        return clearSession(json({ ok: true }));
      }
      const entity = z.object({ id: z.string().min(1).max(80) }).parse(await readBody(req));
      if (path === 'transactions')
        updateState(id, (s) => {
          s.transactions = s.transactions.filter((t) => t.id !== entity.id);
        });
      else if (path === 'goals')
        updateState(id, (s) => {
          s.goals = s.goals.filter((t) => t.id !== entity.id);
        });
      else if (path === 'budgets')
        updateState(id, (s) => {
          s.budgets = s.budgets.filter((t) => t.category !== entity.id);
        });
      else return json({ error: 'Not found' }, 404);
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: e.issues[0]?.message || 'Invalid request' }, 400);
    if (e instanceof RangeError) return json({ error: 'Request too large' }, 413);
    if (e instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
    console.error('API request failed', { path, error: e instanceof Error ? e.name : 'Unknown' });
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
