const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/motion.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { motionDelay, reducedMotion, createMotionController } = context.exports;

function fixture(overrides = {}) {
  const listeners = new Set();
  const visibility = {
    hidden: false,
    addEventListener(type, fn) { assert.equal(type, 'visibilitychange'); listeners.add(fn); },
    removeEventListener(type, fn) { assert.equal(type, 'visibilitychange'); listeners.delete(fn); },
  };
  let callback;
  let created = 0;
  let disconnected = 0;
  const observed = new Set();
  const removed = [];
  const controller = createMotionController({
    visibility, reduced: false, inView: () => false,
    createObserver(fn) {
      created++;
      callback = fn;
      return {
        observe(el) { observed.add(el); },
        unobserve(el) { observed.delete(el); removed.push(el); },
        disconnect() { disconnected++; observed.clear(); },
      };
    },
    ...overrides,
  });
  return { controller, visibility, listeners, observed, removed,
    emit(entries) { callback(entries); },
    visibilityChange() { for (const fn of listeners) fn(); },
    get created() { return created; }, get disconnected() { return disconnected; },
  };
}

test('홈/me 지연 상한과 잘못된 인덱스', () => {
  for (const value of [-1, -Infinity, NaN, Infinity]) {
    assert.equal(motionDelay(value, 'home'), 0);
    assert.equal(motionDelay(value, 'me'), 0);
  }
  assert.equal(motionDelay(1.9, 'home'), 60);
  assert.equal(motionDelay(1.9, 'me'), 40);
  assert.equal(motionDelay(6, 'home'), 360);
  assert.equal(motionDelay(999, 'home'), 360);
  assert.equal(motionDelay(4, 'me'), 160);
  assert.equal(motionDelay(999, 'me'), 160);
});

test('공유 IO는 첫 교차에 unobserve하고 마지막 대상 뒤 disconnect', () => {
  const f = fixture();
  const a = {}, b = {};
  const calls = [];
  f.controller.register(a, 'a', () => calls.push('prepare-a'), animate => calls.push(['a', animate]));
  f.controller.register(b, 'b', () => {}, animate => calls.push(['b', animate]));
  assert.equal(f.created, 1);
  f.emit([{ target: a, isIntersecting: false }]);
  assert.equal(f.removed.length, 0);
  f.emit([{ target: a, isIntersecting: true }]);
  assert.equal(f.removed[0], a);
  assert.equal(f.disconnected, 0);
  f.emit([{ target: b, isIntersecting: true }]);
  assert.equal(f.disconnected, 1);
  assert.deepEqual(calls, ['prepare-a', ['a', true], ['b', true]]);
  f.controller.destroy();
});

test('등장한 키는 새 요소에서도 준비·재등장하지 않는다', () => {
  const f = fixture();
  const a = {};
  f.controller.register(a, 'uuid', () => {}, () => {});
  f.emit([{ target: a, isIntersecting: true }]);
  let animation;
  f.controller.register({}, 'uuid', () => assert.fail('이미 등장한 키를 숨김'), value => { animation = value; });
  assert.equal(animation, false);
  assert.equal(f.created, 1);
  f.controller.destroy();
});

test('처음부터 화면 안에 있는 항목은 관찰을 기다리지 않는다', () => {
  const f = fixture({ inView: () => true });
  let shown = false;
  f.controller.register({}, 'visible', () => assert.fail('즉시 표시 항목을 숨김'), animate => { shown = animate; });
  assert.equal(shown, true);
  assert.equal(f.created, 0);
  f.controller.destroy();
});

test('헤더는 등장 관찰 종료 뒤에도 같은 IO로 화면 밖·hidden 정지를 감시', () => {
  const f = fixture();
  const hero = {}, card = {};
  const states = [];
  f.controller.watchHero(hero, paused => states.push(paused));
  f.controller.register(card, 'card', () => {}, () => {});
  f.emit([{ target: hero, isIntersecting: true }, { target: card, isIntersecting: true }]);
  assert.equal(f.created, 1);
  assert.equal(f.disconnected, 0);
  assert.equal(f.observed.has(hero), true);
  assert.equal(states.at(-1), false);
  f.visibility.hidden = true;
  f.visibilityChange();
  assert.equal(states.at(-1), true);
  f.visibility.hidden = false;
  f.visibilityChange();
  assert.equal(states.at(-1), false);
  f.emit([{ target: hero, isIntersecting: false }]);
  assert.equal(states.at(-1), true);
  f.controller.destroy();
  assert.equal(f.listeners.size, 0);
  assert.equal(f.observed.size, 0);
  assert.equal(f.disconnected, 1);
});

test('destroy는 미등장 콘텐츠를 표시하고 리스너·관찰을 정리', () => {
  const f = fixture();
  const shown = [];
  f.controller.register({}, 'pending', () => {}, value => shown.push(value));
  f.controller.destroy();
  f.controller.destroy();
  assert.deepEqual(shown, [false]);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.disconnected, 1);
});

test('IO 미지원·생성 실패·observe 실패·reduced-motion은 기본 표시', () => {
  for (const overrides of [
    { createObserver: undefined },
    { createObserver() { throw Error('unsupported'); } },
    { createObserver() { return { observe() { throw Error('observe'); }, unobserve() {}, disconnect() {} }; } },
    { reduced: true },
  ]) {
    const f = fixture(overrides);
    const shown = [];
    f.controller.register({}, 'fallback', () => {}, value => shown.push(value));
    assert.ok(shown.length >= 1);
    assert.equal(shown.every(value => value === false), true);
    const states = [];
    f.controller.watchHero({}, value => states.push(value));
    assert.equal(states.at(-1), true);
    f.controller.destroy();
    assert.equal(f.listeners.size, 0);
  }
});

test('삭제된 대상은 해제하며 아직 등장하지 않은 키는 소비하지 않는다', () => {
  const f = fixture();
  const el = {};
  f.controller.register(el, 'later', () => {}, () => {});
  f.controller.retain(new Set());
  assert.equal(f.observed.size, 0);
  assert.equal(f.disconnected, 1);
  let prepared = false;
  f.controller.register({}, 'later', () => { prepared = true; }, () => {});
  assert.equal(prepared, true);
  f.controller.destroy();
});

test('reduced-motion 판정은 미지원·오류에서 안전하게 대체', () => {
  assert.equal(reducedMotion(), true);
  assert.equal(reducedMotion(() => { throw Error('blocked'); }), true);
  assert.equal(reducedMotion(query => {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return { matches: true };
  }), true);
  assert.equal(reducedMotion(() => ({ matches: false })), false);
});
