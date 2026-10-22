const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/reveal-stagger.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exportsObject });
const { revealStagger } = exportsObject;

test('첫 항목은 즉시 시작하고 실제 순서대로 지연한다', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(revealStagger), [0, 60, 120, 180, 240, 300, 360, 360]);
});
test('음수와 NaN은 즉시 표시하고 큰 인덱스는 상한에 고정한다', () => {
  for (const index of [-Infinity, -100, -0.5, 0, NaN]) assert.equal(revealStagger(index), 0);
  for (const index of [6, 100, Number.MAX_VALUE, Infinity]) assert.equal(revealStagger(index), 360);
  assert.equal(revealStagger(2.9), 120);
});
test('모든 경계값은 유한한 지연이며 300ms 등장과 합쳐 700ms 이내다', () => {
  for (const index of [-Infinity, -1, NaN, 0, 0.9, 1, 5.9, 6, 999999, Infinity]) {
    const delay = revealStagger(index);
    assert.ok(Number.isFinite(delay));
    assert.ok(delay >= 0 && delay <= 360);
    assert.ok(delay + 300 <= 700);
  }
});
