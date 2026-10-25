const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const web = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(web, relative), 'utf8');
const source = read('lib/avatar-catalog.ts');
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, sandbox, { filename: 'avatar-catalog.cjs' });
const catalog = sandbox.exports;
const root = '/company-generated/4914e797-98fe-4f77-9812-a5adfc7ab684';
const bytes = [978498,1033357,942820,1135579,1013854,1067574,1044915,1058007,1072053,1150273,994853,1041585,1012945,1039593,981251,1164291,1019020,1065212,1095388,1044365,968475,1105647,1165433,1031756,1022348,982005,961298,1011881,969678,1039395,1014566,998648,940853,1040300,995679,1017633,1040207,1049567,976711,1076250,1043350,1031869,1061065,1063823,985908,1065926,1072863,1012239];
const hashes = [
  '3abe5f9ecece936cc0b774c43778ef541c271686c1b9f47f49c136607d09c19b',
  '8c6e9f3f3eaf47dd05e65098638f20b7e693a625a5757f9304904ca1d3082ce9',
  '102d47bd225e172a4027d842a7fe664ccb11a94e5979d2b3bc9074bb7fc86d29',
  'a532a83c81be4c5cf2c7d31bd7f982be7663a058b20a83585a283af4c2faf73c',
  '028b4408bcedd7741351f1a31f0fd24390969359cfeae0e6bbb694ea95387918',
  'e090c80ae9569a73f30ece26e04b3781d04d0e447fbc2e6e98eafff7fd169d87',
  'dccdda15aa186601a3e6a5d152b69a275198aa35c540f166049e22e07d82870a',
  'fda51bcb4b3be941f6d7419005efdb7b2861ba85af5170cfc224733739e0cede',
  'deddc321cfab1afba8d4c0301243f55760f05e72c5256ca8f2fbb57b396788ee',
  'bce757507bda66b03b40c513eed46f28ef187bb07ed8a3035f4e4d9d0b015d62',
  'dff2981d6c15554133789e1ced2f06bc3159716d528971a5081406d3632bc388',
  'ce1867fd6de1114b0ad855d6111ac67f09ca1a87d3a24b7f555cb73244c236a2',
  'e08c9157e7fe8037af7eef6b9eed34da8d8186665f9e159d344c3346366d9898',
  'db096eea623146677093d25868a2ce25e8f123908c281a6a7a4696c78ecd1bda',
  '0562f1c286d30e845c85415be2b306d5f9bacb4ceaf07fe61af7ce232e3adff0',
  '7cb501f46a6334aaffa579e2d53a82d71f7951a232afa8ee30d119fcfe375cad',
  'f238e96add2a2ab254cc638c6c5f8f055e65ba7298d865a9b74c7060a9344166',
  'bfbc5521f4633fcba04d01d27ed4540d3547e3a553d069d220fd07f3a8e8ce73',
  'b7d20b566f1feda5b97572f834cca8e9a8531283fcaa19c341fb525b70e4588e',
  'c1289845fd394e893dfaa937a9606e86fb95011579c57fdb59e3bacbfd364a26',
  'e4d7a38b2b4f10e51e4b0c1f89dc5ad66a72569da203c74d7b65080111145fcb',
  '5f80d7e27f6aa1cff143683361038096ad2a4c458735757d1f6bc8a0eff519a9',
  '9ff85bfdec1fcf89e22d531c861f71375166917cbeb2ed558bbe557cfca2362c',
  'e8baef14dbf4c23ad077c99554061b8a152bcb42eee1842bc86af7be01239676',
  'b3ae1da3518f278562a63e6d103e7502db9f3c158301badb7e954db51f604f3c',
  '3d95a7dfb4405b9d6addaa6ced99ae40db054e70b5e79cb68aca2edea20cc63d',
  '06ee090302b2da7827787e3e5d8fcfc27fa1b74d3da057370018c6326b40bb28',
  'd5a806d75e1e8b98e4205e631065f785dbc46a17b53f90efd0fe11a7c7f097d2',
  '6b897d4f19f5ecb97605238d8ceae59b2ab4841fa446e100a8b9d0b92d7f6aac',
  '95c7fa0c3ac4f5e48cd60a25980dfef3aa489d61d612ca7996a39f08005b93ff',
  '89ddfc073833c4727a7f9c366af5afc02ab250831e7ba70aceef4ec822d720ff',
  '2839da1165dc7dee3f8c1b3c8c7c5eb81380bd4f45bdafe2cfb752756e1a3d13',
  '73604659c32a177f70802b269933934b0b15a414a497820b150b9b9de4014569',
  'f8032d42b5840b780af8378e2c18b866c85099e683f02b2dd3916799be68d732',
  'ae3c2899746f0fc589c1b5e1e4dae809b56d61dc6232b60c0a3a2e3f3a46b544',
  '6a083bea47ecb85ad628e818237e59bdd7ab1b8d0ed69530e4ac814de0b9aa8f',
  'd4daf910d998a4fc4079ef43999c900675a52b42bec30c13197b35d607e87851',
  '4b9d1d9e5e29897e714f1373f5a646bff1dc15fa5eb841086e7105a423ee78ea',
  '0b81037d91a6c4b99ec82ad71326b429c499c4df32d0998ac07b99b5265b76e4',
  '3f7688cd5d851a90e8af96fc79f99c2ebdd863343243c57818ecb695c24f40bd',
  '0db9bcb43a9ef35deed0d3d01af0434053dd7f11a2a49b35f73bf865e2a84ee4',
  'fe8761c10dec9a9ab76db1b92fc4374c3ba43bbbfb03c6c0d62b96ac2b33c6f4',
  'bff3976d18143e1c966beaeac253af2cb865bfd4f6b48cef75f05e1a0356a669',
  'e9d2d1ab91f78b4e30c7780e932b1050b562edf2d797e59341a9a206ed3a27f2',
  '0aaa983aefc85f409065368987ccd9e2a62c927585f629fa146984056bfd5499',
  'ad5ab28962160436c62592beb0d0a3eacdaa264b223021614ffa0c50dfbbc543',
  'b9dfcb5a18946796f61bbecb94020631c142999e6c00fe8c8112c9039b73b207',
  '304899e06abd96e81cc9eeacb65f382515a92a7fba22ff1baecd77f4eaaa0697',
];

// 변경 전 경로를 독립 oracle로 보존한다.
function legacyPath(uuid, sex, age) {
  const suffix = uuid.slice(-8);
  let variant;
  if (/^[0-9a-f]{8}$/i.test(suffix)) variant = parseInt(suffix, 16) % 6;
  else {
    let h = 2166136261;
    for (const char of uuid.split('')) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    variant = (h >>> 0) % 6;
  }
  const value = age ?? 30;
  const bucket = value < 30 ? 20 : value < 45 ? 30 : value < 65 ? 50 : 70;
  return `/avatars/v1/${sex?.includes('여') ? 'female' : 'male'}-${bucket}-v${variant}.webp`;
}
function sample(i) {
  return crypto.createHash('sha256').update(`avatar-acceptance:${i}`).digest('hex').slice(0, 32);
}

test('48쌍, 96개 고유 경로와 실제 사진 그룹 순서', () => {
  assert.equal(catalog.PAIRS.length, 48);
  const paths = new Set();
  for (let k = 0; k < 48; k++) {
    const gender = k < 24 ? 'male' : 'female';
    const bucket = [20,30,50,70][Math.floor((k % 24) / 6)];
    assert.equal(catalog.PAIRS[k].length, 2);
    assert.equal(catalog.PAIRS[k][0], `/avatars/v1/${gender}-${bucket}-v${k % 6}.webp`);
    assert.equal(catalog.PAIRS[k][1], `${root}/avatar-${String((k + 24) % 48 + 1).padStart(3, '0')}.png`);
    for (const p of catalog.PAIRS[k]) {
      assert.ok(!paths.has(p), p);
      paths.add(p);
      assert.ok(fs.statSync(path.join(web, 'public', p)).isFile(), p);
    }
  }
  assert.equal(paths.size, 96);
});

test('기존 성별·연령 경계·uuid 키 보존', () => {
  for (const uuid of ['hero-haenyeo','hero-farmer','hello','한글😀','00000000','ffffffff','ABCDEF01', ...Array.from({length: 256}, (_, i) => sample(i))]) {
    for (const sex of [undefined, '', '남자', '여자', '여성']) {
      for (const age of [undefined, 0, 20, 29, 29.9, 30, 44, 44.9, 45, 64, 64.9, 65, 70, 99]) {
        assert.equal(catalog.PAIRS[catalog.avatarKey(uuid, sex, age)][0], legacyPath(uuid, sex, age));
      }
    }
  }
});

test('결정적 표본 uuid 24000개: 전체 도달·분포·비트 독립성', () => {
  const counts = Array.from({length: 48}, () => [0, 0]);
  const owners = new Map();
  let matches = 0;
  for (let i = 0; i < 24000; i++) {
    const uuid = sample(i);
    const sex = i % 2 ? '여자' : '남자';
    const age = [20,30,50,70][Math.floor(i / 2) % 4];
    const key = catalog.avatarKey(uuid, sex, age);
    const bit = catalog.avatarPairBit(uuid);
    const selected = catalog.avatarSource(uuid, sex, age);
    assert.ok(bit === 0 || bit === 1);
    assert.equal(selected, catalog.PAIRS[key][bit]);
    assert.equal(selected, catalog.avatarSource(uuid, sex, age));
    if (owners.has(selected)) assert.equal(owners.get(selected), key);
    owners.set(selected, key);
    counts[key][bit]++;
    if (bit === catalog.avatarVariant(uuid) % 2) matches++;
  }
  assert.equal(owners.size, 96);
  counts.forEach(([a,b], key) => {
    assert.ok(a > 0 && b > 0, `도달 key=${key}`);
    assert.ok(a + b >= 100, `충분한 표본 key=${key}`);
    assert.ok(a / (a + b) >= .3 && a / (a + b) <= .7, `분포 key=${key}: ${a}/${b}`);
  });
  assert.ok(matches / 24000 >= .35 && matches / 24000 <= .65, `비트 일치율 ${matches / 24000}`);
});

test('등록 PNG 48장: 물리 bytes·SHA-256·PNG 크기', () => {
  assert.equal(bytes.length, 48);
  assert.equal(hashes.length, 48);
  let total = 0;
  for (let i = 0; i < 48; i++) {
    const asset = `${root}/avatar-${String(i + 1).padStart(3, '0')}.png`;
    const buffer = fs.readFileSync(path.join(web, 'public', asset));
    assert.equal(buffer.length, bytes[i], asset);
    assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), hashes[i], asset);
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(buffer.readUInt32BE(8), 13);
    assert.equal(buffer.toString('ascii', 12, 16), 'IHDR');
    assert.equal(buffer.readUInt32BE(16), 768, asset);
    assert.equal(buffer.readUInt32BE(20), 768, asset);
    assert.ok(buffer.length <= 20 * 1024 * 1024);
    total += buffer.length;
  }
  assert.equal(total, 49700806);
  assert.ok(total <= 64 * 1024 * 1024);
});

test('실제 HERO_SEEDS의 선택 경로·파일 바이트 합계 출력', () => {
  const page = read('app/page.tsx');
  const ast = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let seeds;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'HERO_SEEDS') {
      assert.ok(node.initializer && ts.isArrayLiteralExpression(node.initializer));
      seeds = node.initializer.elements.map((element) => {
        assert.ok(ts.isObjectLiteralExpression(element));
        const seed = {};
        for (const property of element.properties) {
          assert.ok(ts.isPropertyAssignment(property));
          const name = property.name.getText(ast);
          const value = property.initializer;
          assert.ok(ts.isStringLiteral(value) || ts.isNumericLiteral(value));
          seed[name] = ts.isNumericLiteral(value) ? Number(value.text) : value.text;
        }
        return seed;
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(seeds?.length, 5);
  const selected = seeds.map((seed) => {
    const asset = catalog.avatarSource(seed.uuid, seed.sex, seed.age);
    return { uuid: seed.uuid, path: asset, bytes: fs.statSync(path.join(web, 'public', asset)).size };
  });
  const totalBytes = selected.reduce((sum, item) => sum + item.bytes, 0);
  console.log('HERO_EAGER_ASSETS ' + JSON.stringify({ selected, totalBytes }));
  assert.ok(totalBytes > 0);
  assert.equal((page.match(/loading="eager"/g) || []).length, 1);
  assert.match(page, /HERO_SEEDS\.map\([\s\S]*?loading="eager"/);
  const avatar = read('components/Avatar.tsx');
  assert.match(avatar, /loading = "lazy"/);
  assert.match(avatar, /loading=\{loading\}/);
  assert.match(avatar, /width=\{size\}/);
  assert.match(avatar, /height=\{size\}/);
  assert.match(avatar, /decoding="async"/);
});

test('홈 모션과 가상 연애 정적 계약', () => {
  const page = read('app/page.tsx');
  const css = read('app/globals.css');
  assert.equal((page.match(/data-testid="company-home-reveal"/g) || []).length, 2);
  const dating = read('components/HomeDatingPicks.tsx');
  const picks = read('lib/dating-picks.ts');
  assert.ok(!/data-testid="company-dating-(?:cta|chip)"/.test(page + dating));
  assert.match(page, /<HomeDatingPicks onLoginRequired=/);
  assert.equal((dating.match(/company-dating-tab-male/g) || []).length, 1);
  assert.equal((dating.match(/company-dating-tab-female/g) || []).length, 1);
  assert.match(dating, /role="tablist"/);
  assert.match(dating, /role="tab" aria-selected=/);
  assert.match(dating, /aria-controls=/);
  assert.match(dating, /role="tabpanel" aria-labelledby=/);
  assert.match(dating, /useState<DatingSex>\("남자"\)/);
  assert.match(dating, /tabIndex=\{sex === value \? 0 : -1\}/);
  assert.match(dating, /ArrowLeft/);
  assert.match(dating, /ArrowRight/);
  assert.match(dating, /DATING_AGES\.map\(/);
  assert.match(dating, /data-testid="company-dating-age-slot"/);
  assert.equal((picks.match(/label: "/g) || []).length, 4);
  assert.match(dating, /mode: "dating"/);
  assert.match(dating, /if \(locked.current\) return;\s*locked.current = true;/);
  assert.match(dating, /disabled=\{busy\} aria-busy=\{busy\}/);
  assert.match(dating, /cause instanceof LoginRequiredError/);
  assert.match(dating, /\[sex\]: slots/);
  assert.match(dating, /const slot = results\[value\]/);
  assert.match(dating, /sex === value &&/);
  assert.ok(!/\b(?:setTimeout|setInterval|requestAnimationFrame)\s*\(/.test(page + source + dating + picks));
  assert.ok(!/hero-breathe/.test(css.match(/\.btn-hero\s*\{[^}]*\}/)[0]));
  const keyframes = [...css.matchAll(/@keyframes company-home-[\w-]+\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
  assert.equal(keyframes.length, 2);
  for (const [, body] of keyframes) {
    const properties = [...body.matchAll(/([\w-]+)\s*:/g)].map((match) => match[1]);
    assert.ok(properties.length > 0);
    assert.ok(properties.every((property) => ['transform', 'opacity'].includes(property)));
  }
  assert.equal((css.match(/animation:\s*company-home-[^;]*infinite/g) || []).length, 1);
  assert.match(css, /\.company-hero-avatars\s*\{\s*animation: company-home-float 7s ease-in-out infinite;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.company-home-reveal, \.company-hero-avatars\s*\{ animation: none; opacity: 1; transform: none;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-testid="company-motion-list"\][\s\S]*?\[data-testid="company-home-reveal"\]\s*\{\s*animation: none !important; transition: none !important;\s*opacity: 1 !important; transform: none !important;/);
});
