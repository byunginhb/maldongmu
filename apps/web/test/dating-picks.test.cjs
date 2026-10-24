const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/dating-picks.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, sandbox);
const { DATING_AGES, mapDatingPick, createDatingLoader } = sandbox.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));

test('나이 경계와 성별 필터 뒤 첫 유효 후보만 선택한다', () => {
  assert.deepEqual(plain(DATING_AGES), [
    { label: '20대', min: 20, max: 29 }, { label: '30대', min: 30, max: 39 },
    { label: '40대', min: 40, max: 49 }, { label: '50대 이상', min: 50, max: 99 },
  ]);
  for (const sex of ['남자', '여자']) for (const { min, max } of DATING_AGES) {
    const first = { uuid: 'first', sex, age: min };
    const last = { uuid: 'last', sex, age: max };
    const invalid = [
      { uuid: 'wrong-sex', sex: sex === '남자' ? '여자' : '남자', age: min },
      { uuid: 'young', sex, age: min - 1 }, { uuid: 'old', sex, age: max + 1 },
      { uuid: 'missing', sex }, { uuid: 'nan', sex, age: NaN }, { uuid: 'string', sex, age: String(min) },
    ];
    assert.equal(mapDatingPick([...invalid, first, last], sex, min, max), first);
    assert.equal(mapDatingPick([last], sex, min, max), last);
    assert.equal(mapDatingPick(invalid, sex, min, max), null);
    assert.equal(mapDatingPick([], sex, min, max), null);
  }
});

test('남녀 각각 4개 호출 인자·빈 결과·실패·매핑과 캐시', async () => {
  const calls = [];
  const load = createDatingLoader(async (sex, min, max) => {
    calls.push([sex, min, max]);
    if (min === 30) return [];
    if (min === 40) throw new Error('mock failure');
    return [{ uuid: 'outside', sex, age: max + 1 }, { uuid: `${sex}-${min}`, sex, age: min }, { uuid: 'second', sex, age: max }];
  });
  for (const sex of ['남자', '여자']) {
    const first = load(sex);
    assert.equal(load(sex), first);
    const slots = await first;
    assert.equal(slots.length, 4);
    assert.deepEqual(plain(slots.map((slot) => [slot.status, slot.pick?.uuid ?? null])), [
      ['ready', `${sex}-20`], ['ready', null], ['error', null], ['ready', `${sex}-50`],
    ]);
    assert.equal(await load(sex), slots);
  }
  assert.deepEqual(calls, ['남자', '여자'].flatMap((sex) => [[sex,20,29],[sex,30,39],[sex,40,49],[sex,50,99]]));
});

test('여자 응답 뒤 늦은 남자 응답에도 성별 캐시가 섞이지 않는다', async () => {
  const pending = [];
  const load = createDatingLoader((sex, min) => new Promise((resolve) => pending.push({ sex, min, resolve })));
  const male = load('남자');
  const female = load('여자');
  assert.equal(load('남자'), male);
  assert.equal(load('여자'), female);
  assert.equal(pending.length, 8);
  for (const entry of pending.filter((entry) => entry.sex === '여자')) entry.resolve([{ uuid: `female-${entry.min}`, sex: entry.sex, age: entry.min }]);
  const femaleSlots = await female;
  assert.ok(femaleSlots.every((slot) => slot.pick.sex === '여자'));
  for (const entry of pending.filter((entry) => entry.sex === '남자')) entry.resolve([{ uuid: `male-${entry.min}`, sex: entry.sex, age: entry.min }]);
  const maleSlots = await male;
  assert.ok(maleSlots.every((slot) => slot.pick.sex === '남자'));
  assert.equal(await load('여자'), femaleSlots);
  assert.equal(await load('남자'), maleSlots);
  assert.equal(pending.length, 8);
});
