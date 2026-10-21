const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/onboarding-draft.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox, { filename: 'onboarding-draft.js' });
const { createOnboardingDraftStore, ONBOARDING_TTL_MS } = sandbox.exports;

function storage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
}

test('navigation handoff preserves the exact sentence and consumes it before remount/reload', () => {
  const target = storage();
  const home = createOnboardingDraftStore(() => target);
  const text = '今日はどんな一日でしたか？';
  assert.equal(home.save('a', text), true);
  const chat = createOnboardingDraftStore(() => target);
  assert.equal(chat.take('a'), text);
  assert.equal(target.data.size, 0);
  assert.equal(chat.take('a'), '');
  assert.equal(createOnboardingDraftStore(() => target).take('a'), '');
});

test('another conversation cannot consume the intended draft', () => {
  const target = storage();
  const store = createOnboardingDraftStore(() => target);
  store.save('a', 'Hello');
  assert.equal(store.take('b'), '');
  assert.equal(store.take('a'), 'Hello');
});

test('expiry boundary deletes an expired draft', () => {
  let time = 100;
  const target = storage();
  const store = createOnboardingDraftStore(() => target, () => time);
  store.save('a', 'Hello');
  time += ONBOARDING_TTL_MS;
  assert.equal(store.take('a'), '');
  assert.equal(target.data.size, 0);
});

test('rejects blank, missing id and oversized text; allows exactly 2000 characters', () => {
  const store = createOnboardingDraftStore(() => storage());
  assert.equal(store.save('a', ''), false);
  assert.equal(store.save('a', ' \n\t '), false);
  assert.equal(store.save('', 'Hello'), false);
  assert.equal(store.save('a', 'x'.repeat(2001)), false);
  assert.equal(store.save('a', 'x'.repeat(2000)), true);
  assert.equal(store.take('a'), 'x'.repeat(2000));
});

test('blocked storage getter falls back to same-document memory only', () => {
  const blocked = () => { throw new Error('blocked'); };
  const store = createOnboardingDraftStore(blocked);
  assert.equal(store.save('a', 'Hello'), true);
  assert.equal(store.take('a'), 'Hello');
  assert.equal(store.take('a'), '');
  assert.equal(createOnboardingDraftStore(blocked).take('a'), '');
});

test('throwing storage methods fall back to memory', () => {
  const fail = () => { throw new Error('blocked'); };
  const store = createOnboardingDraftStore(() => ({ getItem: fail, setItem: fail, removeItem: fail }));
  store.save('a', 'Hello');
  assert.equal(store.take('a'), 'Hello');
  assert.equal(store.take('a'), '');
});

test('a failed write still allows a memory handoff with readable storage', () => {
  const target = storage();
  target.setItem = () => { throw new Error('full'); };
  const store = createOnboardingDraftStore(() => target);
  store.save('a', 'Hello');
  assert.equal(store.take('a'), 'Hello');
});

test('deletion failure writes a tombstone before handing off', () => {
  const target = storage();
  const store = createOnboardingDraftStore(() => target);
  store.save('a', 'Hello');
  target.removeItem = () => { throw new Error('blocked deletion'); };
  assert.equal(store.take('a'), 'Hello');
  assert.equal(createOnboardingDraftStore(() => target).take('a'), '');
});

test('fails closed when a readable persistent draft cannot be deleted or overwritten', () => {
  const target = storage();
  const store = createOnboardingDraftStore(() => target);
  store.save('a', 'Hello');
  target.removeItem = target.setItem = () => { throw new Error('read only'); };
  assert.equal(store.take('a'), '');
  assert.equal(store.take('a'), '');
});

test('malformed and invalid stored values are discarded', () => {
  for (const raw of ['{', 'null', '"Hello"', JSON.stringify({ text: ' ', expiresAt: 200 }), JSON.stringify({ text: 'x'.repeat(2001), expiresAt: 200 })]) {
    const target = storage();
    target.data.set('mdm_onboarding_v1:a', raw);
    assert.equal(createOnboardingDraftStore(() => target, () => 100).take('a'), '');
    assert.equal(target.data.size, 0);
  }
});
