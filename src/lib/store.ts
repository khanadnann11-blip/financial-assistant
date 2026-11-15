import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { seed } from './seed';
import { type State } from './types';
const path = process.env.DATABASE_PATH || './data/finance.sqlite';
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL, password TEXT, demo INTEGER NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
function passwordHash(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(passwordHash(password, salt).split(':')[1], 'hex'),
  );
}
export function createUser(
  name: string,
  email: string | null,
  password: string | null,
  demo: boolean,
) {
  const id = randomUUID();
  db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    email,
    name,
    password ? passwordHash(password) : null,
    demo ? 1 : 0,
    JSON.stringify(seed(demo)),
    new Date().toISOString(),
  );
  return id;
}
export function login(email: string, password: string) {
  const user = db.prepare('SELECT id, password FROM users WHERE email = ?').get(email) as
    { id: string; password: string } | undefined;
  // Do equivalent password work for unknown addresses to reduce timing leakage.
  const fallback = passwordHash('dummy-password', '00000000000000000000000000000000');
  return verifyPassword(password, user?.password || fallback) && user ? user.id : null;
}
export function newSession(id: string) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(
    hashToken(token),
    id,
    Date.now() + 7 * 86400000,
  );
  return token;
}
export function userFor(token?: string) {
  if (!token) return null;
  const row = db
    .prepare('SELECT user_id FROM sessions WHERE token = ? AND expires > ?')
    .get(hashToken(token), Date.now()) as { user_id: string } | undefined;
  return row?.user_id || null;
}
export function revoke(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
}
export function getState(id: string): State {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as {
    name: string;
    email: string | null;
    demo: number;
    data: string;
    updated: string;
  };
  return {
    ...JSON.parse(row.data),
    user: { name: row.name, email: row.email || '', demo: Boolean(row.demo) },
    updatedAt: row.updated,
    assistantMode: process.env.OPENAI_API_KEY ? 'AI-assisted routing' : 'Local financial assistant',
  };
}
export function updateState(id: string, mutate: (state: State) => void) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const state = getState(id);
    mutate(state);
    const { accounts, transactions, budgets, goals } = state;
    db.prepare('UPDATE users SET data = ?, updated = ? WHERE id = ?').run(
      JSON.stringify({ accounts, transactions, budgets, goals }),
      new Date().toISOString(),
      id,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function deleteUser(id: string) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
export function allow(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  db.prepare('DELETE FROM limits WHERE expires < ?').run(now);
  db.prepare(
    'INSERT INTO limits VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1',
  ).run(key, now + windowMs);
  const row = db.prepare('SELECT count FROM limits WHERE key = ?').get(key) as { count: number };
  return row.count <= maximum;
}
export function cleanup() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
  db.prepare(
    'DELETE FROM users WHERE demo = 1 AND NOT EXISTS (SELECT 1 FROM sessions WHERE user_id = users.id)',
  ).run();
}
