import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH = ':memory:';
import * as store from '../src/lib/store';
test('sessions isolate user data and deletion revokes access', () => {
  const a = store.createUser('Alice', 'alice@example.test', 'a-long-secret-password', false);
  const b = store.createUser('Bob', 'bob@example.test', 'another-long-password', false);
  const sa = store.newSession(a);
  const sb = store.newSession(b);
  store.updateState(a, (s) =>
    s.goals.push({
      id: 'private',
      name: 'Alice only',
      target: 10000,
      saved: 0,
      deadline: '2027-01-01',
    }),
  );
  assert.equal(store.userFor(sa), a);
  assert.equal(store.userFor(sb), b);
  assert.equal(store.getState(a).goals.length, 1);
  assert.equal(store.getState(b).goals.length, 0);
  store.deleteUser(a);
  assert.equal(store.userFor(sa), null);
  assert.equal(store.userFor(sb), b);
});
test('invalid passwords and unknown users cannot log in', () => {
  const id = store.createUser('Charlie', 'charlie@example.test', 'correct-password-123', false);
  assert.equal(store.login('charlie@example.test', 'correct-password-123'), id);
  assert.equal(store.login('charlie@example.test', 'wrong-password-123'), null);
  assert.equal(store.login('unknown@example.test', 'correct-password-123'), null);
});
test('session revocation and unknown tokens are rejected', () => {
  const id = store.createUser('Demo', null, null, true);
  const token = store.newSession(id);
  store.revoke(token);
  assert.equal(store.userFor(token), null);
  assert.equal(store.userFor('forged'), null);
});
test('failed data mutations roll back atomically', () => {
  const id = store.createUser('Demo', null, null, true);
  assert.throws(() =>
    store.updateState(id, (s) => {
      s.goals.push({ id: 'x', name: 'x', target: 100, saved: 0, deadline: '2027-01-01' });
      throw new Error('rollback');
    }),
  );
  assert.equal(store.getState(id).goals.length, 3);
});
test('rate limiter enforces limits', () => {
  assert.equal(store.allow('test', 2, 60000), true);
  assert.equal(store.allow('test', 2, 60000), true);
  assert.equal(store.allow('test', 2, 60000), false);
});
