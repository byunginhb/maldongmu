'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

// Compile only the pure module in memory; do not load application dependencies.
const filename = path.resolve(__dirname, '../lib/i18n.ts');
const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  },
  reportDiagnostics: true,
});
const errors = (result.diagnostics || []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
  getCanonicalFileName: (name) => name,
  getCurrentDirectory: () => __dirname,
  getNewLine: () => '\n',
}));
const sandbox = { exports: {} };
vm.runInNewContext(result.outputText, sandbox, { filename });
const { pickLang, translate } = sandbox.exports;

function cases(title, entries) {
  test(title, () => {
    for (const [header, expected] of entries) {
      assert.equal(pickLang(header), expected, String(header));
    }
  });
}

cases('missing or empty header defaults to Korean', [
  [undefined, 'ko'], [null, 'ko'], ['', 'ko'], [' \t ', 'ko'],
]);

cases('supported languages match primary subtags without case sensitivity', [
  ['ko', 'ko'], ['en', 'en'], ['ja', 'ja'],
  ['ko-KR,ko;q=0.9,en;q=0.8', 'ko'],
  ['ja-JP', 'ja'], ['en-US', 'en'],
  [' KO-kr ', 'ko'], ['JA-jp', 'ja'], ['EN-us', 'en'],
  ['ja-Jpan-JP', 'ja'], ['fr-FR,ja-JP', 'ja'],
  ['korean,ja', 'ja'], ['jafoo,ko', 'ko'], ['ko_,ja', 'ja'],
]);

cases('higher quality wins and omitted quality is one', [
  ['en-US;q=0.2,ko-KR;q=1', 'ko'],
  ['en;q=0,ja-JP;q=1', 'ja'],
  ['ja-JP;q=0.1,en-US;q=1', 'en'],
  ['ko;q=0.5,ja', 'ja'],
  ['ja;q=0.001,ko;q=0.002', 'ko'],
  ['ko;q=0.999,en;q=1.000', 'en'],
  ['en;q=0.1, JA-jp ; Q = 0.900', 'ja'],
  ['en;q=0.1,ko;q=1.', 'ko'],
  ['ko;q=0.,ja;q=0.001', 'ja'],
]);

cases('equal quality preserves original order', [
  ['en-US;q=0.8,ja-JP;q=0.8', 'en'],
  ['ja;q=0.8,en;q=0.8', 'ja'],
  ['ko,ja', 'ko'], ['ja,ko', 'ja'],
  ['ko;q=0.2,ja;q=0.9,en;q=0.9', 'ja'],
]);

cases('zero quality ranges are excluded', [
  ['ko;q=0,ja;q=0.5', 'ja'],
  ['ja;q=0.000,ko;q=0.001', 'ko'],
  ['ko;q=0,ja;q=0,en;q=0', 'en'],
  ['ko;q=0', 'en'], ['ja;q=0', 'en'],
]);

test('malformed or out-of-range quality excludes that range', () => {
  for (const quality of [
    '', 'abc', 'NaN', 'Infinity', '-0.1', '1.1', '2', '.5',
    '+0.5', '01', '0.1234', '1.0000', '1e0', '0.5x', '0x1',
    '0.5=0.6', '"0.5"',
  ]) {
    assert.equal(pickLang(`ko;q=${quality},ja;q=0.1`), 'ja', quality);
    assert.equal(pickLang(`ja;q=${quality}`), 'en', quality);
  }
  assert.equal(pickLang('ko;q,ja;q=0.1'), 'ja');
  assert.equal(pickLang('ko;q=0.8;q=0.9,ja;q=0.1'), 'ja');
  assert.equal(pickLang('ko;q=0;q=1,ja;q=0.1'), 'ja');
});

cases('unsupported, wildcard-only and unusable nonempty headers fall back to English', [
  ['fr-FR', 'en'], ['de,fr;q=0.9', 'en'], ['*', 'en'],
  ['*;q=0', 'en'], ['*;q=invalid', 'en'], [',', 'en'],
  [';q=1', 'en'], ['ko-;q=1', 'en'],
]);

cases('wildcards are skipped when supported languages are present', [
  ['*;q=1,ko;q=0.5', 'ko'],
  ['ja;q=0.1,*;q=1', 'ja'],
  ['*;q=0,ko;q=0', 'en'],
  ['fr;q=1,*;q=1,ja;q=0.2', 'ja'],
]);

test('translation dictionaries and interpolation retain existing behavior', () => {
  assert.equal(translate('ko', '홈'), '홈');
  assert.equal(translate('en', '홈'), 'Home');
  assert.equal(translate('ja', '홈'), 'ホーム');
  assert.equal(translate('ko', 'hello {name}', { name: 'Ben' }), 'hello Ben');
  assert.equal(translate('en', 'missing {name} {count}', { name: 'Ben', count: 2 }), 'missing Ben 2');
  assert.equal(translate('ja', 'missing {name}'), 'missing {name}');
  assert.equal(translate('ko', '{known} {unknown}', { known: 0 }), '0 {unknown}');
  assert.equal(translate('en', '{age}세', { age: 20 }), '20');
  assert.equal(translate('ja', '{age}세', { age: 20 }), '20歳');
});
