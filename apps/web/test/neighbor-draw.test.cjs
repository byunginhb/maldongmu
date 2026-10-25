const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function load() {
  const exports = {};
  const code = ts.transpileModule(read('lib/neighbor-draw.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports });
  return exports;
}
const card = (uuid = 'a') => ({ uuid, name: '김이웃', sex: '여자', age: 37, occupation: '작가', province: '서울', oneLiner: '반갑습니다.' });

test('정상 응답을 명시적 필드로 매핑하며 잘못된 응답을 거부한다', () => {
  const { parseDrawNeighbor } = load();
  assert.deepEqual(JSON.parse(JSON.stringify(parseDrawNeighbor({ ...card(), extra: 'ignored' }))), card());
  for (const bad of [null, [], {}, { items: [card()] }, { ...card(), age: '37' }, { ...card(), age: -1 }, { ...card(), age: 1.5 }, { ...card(), age: 131 }]) {
    assert.throws(() => parseDrawNeighbor(bad));
  }
  for (const key of ['uuid', 'name', 'sex', 'occupation', 'province', 'oneLiner']) {
    assert.throws(() => parseDrawNeighbor({ ...card(), [key]: ' ' }));
    assert.throws(() => parseDrawNeighbor({ ...card(), [key]: null }));
  }
});

test('첫 뽑기는 한 번 호출하며 대기 중 호출은 동일 Promise를 공유한다', async () => {
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  const draw = load().createNeighborDraw(() => { calls++; return gate; });
  const first = draw.draw();
  assert.equal(first, draw.draw());
  await Promise.resolve();
  assert.equal(calls, 1);
  release(card());
  assert.equal((await first).uuid, 'a');
});

test('최근 중복은 회피하되 재요청 두 번 후에는 겹친 결과도 반환한다', async () => {
  const queue = ['a', 'a', 'b', 'b', 'b', 'b'];
  let calls = 0;
  const draw = load().createNeighborDraw(async () => { calls++; return card(queue.shift()); });
  assert.equal((await draw.draw()).uuid, 'a');
  assert.equal(calls, 1);
  assert.equal((await draw.draw()).uuid, 'b');
  assert.equal(calls, 3);
  assert.equal((await draw.draw()).uuid, 'b');
  assert.equal(calls, 6);
});

test('네트워크·응답 검증·동기 실패 뒤 잠금이 해제되고 최근 이력은 오염되지 않는다', async () => {
  for (const failure of ['network', 'invalid', 'sync']) {
    let calls = 0;
    const draw = load().createNeighborDraw(() => {
      calls++;
      if (calls > 1) return Promise.resolve(card('recovered'));
      if (failure === 'sync') throw new Error('sync');
      return failure === 'network' ? Promise.reject(new Error('network')) : Promise.resolve({});
    });
    await assert.rejects(draw.draw());
    assert.equal(draw.recentIds().length, 0);
    assert.equal((await draw.draw()).uuid, 'recovered');
    assert.equal(calls, 2);
  }
});

test('최근 목록은 크기 제한을 지키며 외부에 변경 가능한 내부 배열을 노출하지 않는다', async () => {
  let n = 0;
  const draw = load().createNeighborDraw(async () => card(String(++n)), 2);
  await draw.draw(); await draw.draw(); await draw.draw();
  assert.equal(Array.from(draw.recentIds()).join(','), '2,3');
  draw.recentIds().push('external');
  assert.equal(Array.from(draw.recentIds()).join(','), '2,3');
  for (const limit of [0, -1, 1.5, 101, NaN]) assert.throws(() => load().createNeighborDraw(async () => card(), limit));
});

test('메뉴 이동과 뽑기 화면 정적 계약 및 기존 홈 연결을 보존한다', () => {
  const home = read('app/page.tsx');
  const nav = read('components/TabBar.tsx');
  for (const source of [home, nav]) {
    assert.doesNotMatch(source, /\/grannies|욕쟁이 할매|GRANNY_FACES/);
  }
  assert.match(home, /<HomeBalanceGame featured=\{featured\}/);
  assert.match(home, /<HomeDatingPicks/);
  assert.equal((home.match(/loading="eager"/g) || []).length, 1);
  assert.match(nav, /href: "\/draw", label: "뽑기"/);
  assert.equal((nav.match(/company-nav-draw/g) || []).length, 1);
  const meet = read('app/meet/page.tsx');
  const granny = meet.indexOf('data-testid="company-meet-granny"');
  assert.ok(granny > 0 && granny < meet.indexOf('{items === null'));
  assert.match(meet, /href="\/grannies"/);
  assert.match(meet, /t\("지역별 사투리 할매"\)/);
  const grannies = read('app/grannies/page.tsx');
  assert.match(grannies, /company-grannies-back/);
  assert.match(grannies, /router.push\("\/meet"\)/);
  assert.match(grannies, /apiPost<\{ id: string \}>\("\/conversations", \{ personaUuid: uuid \}\)/);
  const page = read('app/draw/page.tsx');
  for (const id of ['title', 'stage', 'button', 'result', 'chat', 'again']) assert.equal((page.match(new RegExp('data-testid="company-draw-' + id + '"', 'g')) || []).length, 1);
  assert.match(page, /apiGet<unknown>\("\/personas\/random"\)/);
  assert.match(page, /personaUuid: person.uuid/);
  assert.match(page, /role="alert"/);
  assert.match(page, /instanceof LoginRequiredError/);
  assert.match(page, /className="btn-ghost" data-testid="company-draw-again"/);
  assert.match(page, /aria-busy=\{busy === "draw"\}/);
  assert.doesNotMatch(page, /setTimeout|setInterval|requestAnimationFrame/);
  const css = read('app/globals.css');
  assert.match(css, /\.tabbar a:focus-visible/);
  assert.match(css, /\.company-draw-actions button:focus-visible/);
  assert.match(css, /\.company-draw-actions button \{[^}]*min-height: 48px/);
  const preview = fs.readFileSync(path.resolve(root, '../server/test/preview-chat.cjs'), 'utf8');
  assert.ok(preview.indexOf('"/api/personas/random"') < preview.indexOf('"/api/personas/:uuid"'));
});
