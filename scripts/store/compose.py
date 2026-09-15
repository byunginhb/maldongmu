"""Play 스토어 그래픽 합성기 — raw 폰 캡처(1170×2532)에 브랜드 프레임을 씌워 1080×1920 스크린샷과 1024×500 피처 그래픽을 만든다.

사용법:
  python3 scripts/store/compose.py                 # ko-KR → docs/store/images/*.png
  python3 scripts/store/compose.py en-US ja-JP zh-TW zh-CN   # 현지화 → docs/store/images/<locale>/ (zh-HK는 zh-TW 이미지 재사용)
폰트: Pretendard(otf)는 없으면 jsdelivr에서 내려받아 ~/.cache/maldongmu-fonts/ 에 둔다. 도트 폰트는 시스템 NeoDunggeunmoPro,
없으면 ~/.cache/maldongmu-fonts/NeoDunggeunmoPro.ttf. 일본어·중국어는 같은 캐시의 NotoSansJP/TC/SC.ttf(가변 폰트).
raw 캡처는 Playwright(iPhone 390×844, DPR 3)로 라이브 사이트를 찍은 것 — docs/store/listing.md §5 참고.
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "docs/store/images/raw"
OUT = ROOT / "docs/store/images"
FONT_DIR = Path.home() / ".cache/maldongmu-fonts"
PRETENDARD = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-{w}.otf"
DOT_FONT = next((p for p in [Path.home() / "Library/Fonts/NeoDunggeunmoPro-Regular.ttf", FONT_DIR / "NeoDunggeunmoPro.ttf"] if p.exists()),
                FONT_DIR / "NeoDunggeunmoPro.ttf")
# 언어별 본문 폰트: ko/en은 Pretendard, 그 외는 Noto Sans 가변 폰트(Bold/Regular 축)
CJK_FONT = {"ja-JP": "NotoSansJP.ttf", "zh-TW": "NotoSansTC.ttf", "zh-HK": "NotoSansTC.ttf", "zh-CN": "NotoSansSC.ttf"}
LOCALE = "ko-KR"

CREAM, CREAM_DEEP, PEACH = (242, 233, 217), (236, 226, 210), (236, 208, 186)
BROWN, BROWN_SOFT, CORAL, WHITE = (61, 43, 31), (140, 115, 97), (232, 97, 60), (252, 248, 242)

# (raw 파일, 출력 파일, 배지, 헤드라인 줄들[(텍스트, 코랄 강조 여부) 조각 리스트], 서브 줄들)
SHOTS = [
    ("01-dating.png", "screenshot-01-dating.png", "가상 연애",
     [[("설레는 첫 만남,", False)], [("가상 연애", True), (" 해보기", False)]],
     ["성별과 나이대만 고르면", "소개팅 자리로 안내해드려요"]),
    ("02-dating-chat.png", "screenshot-02-affection.png", "호감도",
     [[("말 한마디에", False)], [("마음", True), ("이 움직여요", False)]],
     ["대화 흐름 따라 오르내리는 호감도", "서두르지 않는, 진짜 같은 연애"]),
    ("03-grannies.png", "screenshot-03-grannies.png", "욕쟁이 할매",
     [[("지역별 ", False), ("욕쟁이 할매", True), ("와", False)], [("한바탕 수다 한판", False)]],
     ["수도권·경상·전라·충청·제주", "입은 걸어도 정은 깊은 우리 동네 할매들"]),
    ("04-granny-chat.png", "screenshot-04-chat.png", "진짜 같은 대화",
     [[("사투리 그대로,", False)], [("진짜 사람", True), (" 같은 대화", False)]],
     ["AI가 아니라 옆집 할매처럼", "툭툭 타박하다 결국 밥부터 챙겨줘요"]),
    ("05-home.png", "screenshot-05-home.png", "오늘의 인연",
     [[("오늘은 ", False), ("누구랑", True)], [("얘기할까요?", False)]],
     ["누굴 만날지 모르는 오늘의 인연부터", "친구 둘과 셋이서 수다까지"]),
    ("06-meet.png", "screenshot-06-meet.png", "100만 이웃",
     [[("판사·소방관·해녀", True)], [("평소엔 못 만날 사람들", False)]],
     ["실제 인구 데이터로 빚은 100만 페르소나", "매일 새로운 분이 인사드려요"]),
]


CAPTIONS = {
    "en-US": {
        "brand": "Maldongmu",
        "feature": ([[("From ", False), ("virtual dating", True)], [("to 1M Korean neighbors", False)]],
                    "Grandmas, judges, sea divers — AI that feels real"),
        "shots": [
            ("Virtual dating", [[("A first date,", False)], [("without the nerves", True)]],
             ["Pick a gender and an age range —", "we seat you at a quiet café"]),
            ("Affection", [[("Every word", False)], [("moves their heart", True)]],
             ["An affection meter that follows the talk", "Slow, real, never rushed"]),
            ("Grandmas", [[("Korea's ", False), ("cursing grandmas", True)], [("from every region", False)]],
             ["Seoul · Busan · Jeolla · Chungcheong · Jeju", "Sharp tongue, soft heart"]),
            ("Real talk", [[("Dialect intact,", False)], [("real as a neighbor", True)]],
             ["Not an assistant — the grandma next door", "who scolds you, then feeds you"]),
            ("Today's match", [[("Who will you", False)], [("talk to today?", True)]],
             ["A random match, no spoilers,", "or invite two friends for a three-way chat"]),
            ("1M neighbors", [[("Judges, firefighters,", True)], [("haenyeo divers", False)]],
             ["1,000,000 personas from real census data", "New faces every day — in your language"]),
        ],
    },
    "ja-JP": {
        "brand": "Maldongmu",
        "feature": ([[("ときめく", False), ("恋愛シミュレーション", True)], [("から100万人の隣人まで", False)]],
                    "毒舌おばあちゃん・裁判官・海女 — 本物みたいなAI"),
        "shots": [
            ("恋愛シミュレーション", [[("ときめく初対面、", False)], [("恋愛シミュ", True), ("を体験", False)]],
             ["性別と年代を選ぶだけで", "お見合いの席へご案内"]),
            ("好感度", [[("ひと言で", False)], [("心", True), ("が動く", False)]],
             ["会話の流れで上下する好感度", "急がない、本物みたいな恋"]),
            ("毒舌おばあちゃん", [[("地方ごとの", False)], [("毒舌おばあちゃん", True)]],
             ["ソウル・釜山・全羅・忠清・済州", "口は悪くても情は深い"]),
            ("本物みたいな会話", [[("方言そのまま、", False)], [("本物の人", True), ("みたい", False)]],
             ["AIではなく隣のおばあちゃんのように", "叱りつけて、結局ご飯の心配"]),
            ("今日の縁", [[("今日は", False), ("誰と", True)], [("話しますか？", False)]],
             ["誰に会うかわからない今日の縁から", "友だち二人と三人おしゃべりまで"]),
            ("100万人の隣人", [[("裁判官・消防士・海女", True)], [("普段は会えない人たち", False)]],
             ["実際の人口データから生まれた100万人", "毎日新しい人が、あなたの言語で"]),
        ],
    },
    "zh-TW": {
        "brand": "Maldongmu",
        "feature": ([[("從心動的", False), ("虛擬戀愛", True)], [("到100萬個韓國鄰居", False)]],
                    "毒舌阿嬤・法官・海女 — 像真人一樣的AI角色"),
        "shots": [
            ("虛擬戀愛", [[("心動的初次見面，", False)], [("虛擬戀愛", True), ("試試看", False)]],
             ["只要選性別和年齡層", "就帶你到相親的座位"]),
            ("好感度", [[("一句話", False)], [("就牽動的心", True)]],
             ["隨著對話起伏的好感度", "不急不躁，像真的一樣"]),
            ("毒舌阿嬤", [[("各地的", False), ("毒舌阿嬤", True)], [("聊個痛快", False)]],
             ["首爾・釜山・全羅・忠清・濟州", "嘴硬心軟的韓國阿嬤"]),
            ("像真人的對話", [[("方言原汁原味，", False)], [("像真人", True), ("一樣", False)]],
             ["不是AI，是隔壁的阿嬤", "罵完你，還是先問飯吃了沒"]),
            ("今日緣分", [[("今天要和", False), ("誰", True)], [("聊聊呢？", False)]],
             ["從不知道會遇見誰的今日緣分", "到和兩位朋友三人聊天"]),
            ("100萬鄰居", [[("法官・消防員・海女", True)], [("平常遇不到的人", False)]],
             ["來自真實人口資料的100萬個角色", "每天有新面孔，用你的語言回覆"]),
        ],
    },
    "zh-CN": {
        "brand": "Maldongmu",
        "feature": ([[("从心动的", False), ("虚拟恋爱", True)], [("到100万个韩国邻居", False)]],
                    "毒舌奶奶・法官・海女 — 像真人一样的AI角色"),
        "shots": [
            ("虚拟恋爱", [[("心动的初次见面，", False)], [("虚拟恋爱", True), ("试试看", False)]],
             ["只要选性别和年龄段", "就带你到相亲的座位"]),
            ("好感度", [[("一句话", False)], [("就牵动的心", True)]],
             ["随着对话起伏的好感度", "不急不躁，像真的一样"]),
            ("毒舌奶奶", [[("各地的", False), ("毒舌奶奶", True)], [("聊个痛快", False)]],
             ["首尔・釜山・全罗・忠清・济州", "嘴硬心软的韩国奶奶"]),
            ("像真人的对话", [[("方言原汁原味，", False)], [("像真人", True), ("一样", False)]],
             ["不是AI，是隔壁的奶奶", "骂完你，还是先问饭吃了没"]),
            ("今日缘分", [[("今天要和", False), ("谁", True)], [("聊聊呢？", False)]],
             ["从不知道会遇见谁的今日缘分", "到和两位朋友三人聊天"]),
            ("100万邻居", [[("法官・消防员・海女", True)], [("平常遇不到的人", False)]],
             ["来自真实人口数据的100万个角色", "每天有新面孔，用你的语言回复"]),
        ],
    },
}


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    if LOCALE in CJK_FONT:
        f = ImageFont.truetype(str(FONT_DIR / CJK_FONT[LOCALE]), size)
        f.set_variation_by_name(weight)
        return f
    path = FONT_DIR / f"Pretendard-{weight}.otf"
    if not path.exists():
        urllib.request.urlretrieve(PRETENDARD.format(w=weight), path)
    return ImageFont.truetype(str(path), size)


def dot_font(size: int) -> ImageFont.FreeTypeFont:
    # 도트 폰트는 한글·라틴만 → 일본어·중국어 배지는 본문 볼드로
    if LOCALE in CJK_FONT:
        return font("Bold", size)
    return ImageFont.truetype(str(DOT_FONT), size)


def canvas(w: int, h: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (w, h), CREAM)
    d = ImageDraw.Draw(im)
    r = int(w * 0.36)
    d.ellipse([w - r - 60, -r + 120, w + r - 60, 120 + r], fill=PEACH)  # 우상단 복숭아빛 원
    d.ellipse([-r + 40, h - 140, r + 40, h - 140 + 2 * r], fill=CREAM_DEEP)  # 좌하단 은은한 원
    return im, d


def draw_runs(d: ImageDraw.ImageDraw, xy: tuple[int, int], runs, f: ImageFont.FreeTypeFont) -> None:
    x, y = xy
    for text, accent in runs:
        d.text((x, y), text, font=f, fill=CORAL if accent else BROWN)
        x += d.textlength(text, font=f)


def badge(d: ImageDraw.ImageDraw, im: Image.Image, xy: tuple[int, int], label: str) -> None:
    x, y = xy
    f = dot_font(34)
    w = int(d.textlength(label, font=f)) + 110
    d.rounded_rectangle([x, y, x + w, y + 64], radius=32, fill=WHITE, outline=(225, 210, 190), width=2)
    bubble(d, (x + 22, y + 18))
    d.text((x + 66, y + 14), label, font=f, fill=CORAL)


def bubble(d: ImageDraw.ImageDraw, xy: tuple[int, int]) -> None:
    """코랄 도트 말풍선 (앱 아이콘과 동일 모티프)."""
    x, y = xy
    d.rounded_rectangle([x, y, x + 30, y + 22], radius=4, fill=CORAL)
    d.polygon([(x + 6, y + 22), (x + 6, y + 29), (x + 13, y + 22)], fill=CORAL)
    for i in range(3):
        d.rectangle([x + 7 + i * 7, y + 9, x + 10 + i * 7, y + 12], fill=WHITE)


def phone(im: Image.Image, raw: Path, box: tuple[int, int, int], border: int = 14, radius: int = 62) -> None:
    """box=(x, y, width): 폰 프레임 왼쪽 위와 폭. 아래쪽은 캔버스 밖으로 흘러넘치게 둔다."""
    x, y, w = box
    shot = Image.open(raw).convert("RGB")
    inner_w = w - 2 * border
    shot = shot.resize((inner_w, int(shot.height * inner_w / shot.width)), Image.LANCZOS)
    h = shot.height + border
    frame = Image.new("RGBA", (w, h + radius), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle([0, 0, w - 1, h + radius], radius=radius, fill=BROWN)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, inner_w - 1, shot.height + radius], radius=radius - border, fill=255)
    frame.paste(shot, (border, border), mask)
    im.paste(frame, (x, y), frame)


def out_dir() -> Path:
    d = OUT if LOCALE == "ko-KR" else OUT / LOCALE
    d.mkdir(parents=True, exist_ok=True)
    return d


def fit(d: ImageDraw.ImageDraw, runs, f: ImageFont.FreeTypeFont, max_w: int, family: str, size: int):
    """한 줄이 폭을 넘으면 글자 크기를 줄인다 (영문 헤드라인 대비)."""
    while size > 18 and sum(d.textlength(t, font=f) for t, _ in runs) > max_w:
        size -= 4
        f = font(family, size)
    return f


def screenshot(raw: str, out: str, label: str, head, subs) -> None:
    im, d = canvas(1080, 1920)
    badge(d, im, (80, 110), label)
    for i, runs in enumerate(head):
        draw_runs(d, (80, 215 + i * 104), runs, fit(d, runs, font("Bold", 88), 920, "Bold", 88))
    for i, s in enumerate(subs):
        d.text((80, 435 + i * 56), s, font=fit(d, [(s, False)], font("Regular", 38), 920, "Regular", 38), fill=BROWN_SOFT)
    phone(im, RAW / raw, (225, 642, 630))
    im.save(out_dir() / out, optimize=True)
    print("wrote", LOCALE, out)


def feature_graphic() -> None:
    im, d = canvas(1024, 500)
    bubble(d, (86, 112))
    loc = CAPTIONS.get(LOCALE)
    brand = loc["brand"] if loc else "말동무"
    lines, tagline = loc["feature"] if loc else (
        [[("설레는 ", False), ("가상 연애", True), ("부터", False)], [("100만 이웃과의 수다까지", False)]],
        "욕쟁이 할매·판사·해녀 — 진짜 같은 AI 페르소나와 대화")
    d.text((150, 92), brand, font=dot_font(76), fill=CORAL)
    for i, runs in enumerate(lines):
        draw_runs(d, (84, 210 + i * 66), runs, fit(d, runs, font("Bold", 56), 600, "Bold", 56))
    d.text((84, 372), tagline, font=fit(d, [(tagline, False)], font("Regular", 27), 600, "Regular", 27), fill=BROWN_SOFT)
    phone(im, RAW / "01-dating.png", (706, 8, 300), border=8, radius=34)
    im.save(out_dir() / "feature-graphic.png", optimize=True)
    print("wrote", LOCALE, "feature-graphic.png")


if __name__ == "__main__":
    import sys
    for loc in sys.argv[1:] or ["ko-KR"]:
        LOCALE = loc
        shots = SHOTS if loc == "ko-KR" else [(raw, out) + cap for (raw, out, *_), cap in zip(SHOTS, CAPTIONS[loc]["shots"])]
        for raw, out, label, head, subs in shots:
            screenshot(raw, out, label, head, subs)
        feature_graphic()
