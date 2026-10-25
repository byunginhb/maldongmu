const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name) {
  const filename = path.join(__dirname, '../lib', name + '.ts');
  const sandbox = { exports: {}, require: (id) => load(id.replace('./', '')) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, sandbox, { filename });
  return sandbox.exports;
}

const { BALANCE_QUESTIONS, balanceMessage } = load('balance-game');
const { translate } = load('i18n');

test('either choice sends the question, both alternatives and the selected answer', () => {
  const question = { question: '하나를 평생 포기해야 한다면?', options: ['커피 포기', '야식 포기'] };
  for (const choice of [0, 1]) {
    assert.equal(balanceMessage(question, choice, 'ko'),
      `밸런스 게임 해요! 하나를 평생 포기해야 한다면?\n선택지는 "커피 포기" 또는 "야식 포기"예요. 저는 "${choice === 0 ? '커피 포기' : '야식 포기'}" 쪽이에요. 당신은 어느 쪽이에요? 고른 이유도 궁금해요.`);
  }
});

test('every playable question stays translated and within the one-shot draft limit', () => {
  assert.ok(BALANCE_QUESTIONS.length > 1);
  for (const lang of ['ko', 'en', 'ja']) {
    for (const question of BALANCE_QUESTIONS) {
      for (const choice of [0, 1]) {
        const message = balanceMessage(question, choice, lang);
        assert.ok(message.includes(translate(lang, question.question)));
        assert.ok(message.includes(translate(lang, question.options[choice])));
        assert.ok(message.length <= 2000);
        assert.doesNotMatch(message, /\{(?:question|first|second|choice)\}/);
        if (lang !== 'ko') assert.doesNotMatch(message, /[가-힣]/);
      }
    }
  }
});
