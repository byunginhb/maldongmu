"""Play 스토어 그래픽 합성기 — raw 폰 캡처(1170×2532)에 브랜드 프레임을 씌워 1080×1920 스크린샷과 1024×500 피처 그래픽을 만든다.

사용법:
  python3 scripts/store/compose.py            # docs/store/images/raw/*.png → docs/store/images/*.png
폰트: Pretendard(otf)는 없으면 jsdelivr에서 내려받아 ~/.cache/maldongmu-fonts/ 에 둔다. 도트 폰트는 시스템 NeoDunggeunmoPro 사용.
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
DOT_FONT = Path.home() / "Library/Fonts/NeoDunggeunmoPro-Regular.ttf"

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


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    path = FONT_DIR / f"Pretendard-{weight}.otf"
    if not path.exists():
        urllib.request.urlretrieve(PRETENDARD.format(w=weight), path)
    return ImageFont.truetype(str(path), size)


def dot_font(size: int) -> ImageFont.FreeTypeFont:
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


def screenshot(raw: str, out: str, label: str, head, subs) -> None:
    im, d = canvas(1080, 1920)
    badge(d, im, (80, 110), label)
    for i, runs in enumerate(head):
        draw_runs(d, (80, 215 + i * 104), runs, font("Bold", 88))
    for i, s in enumerate(subs):
        d.text((80, 435 + i * 56), s, font=font("Regular", 38), fill=BROWN_SOFT)
    phone(im, RAW / raw, (225, 642, 630))
    im.save(OUT / out, optimize=True)
    print("wrote", out)


def feature_graphic() -> None:
    im, d = canvas(1024, 500)
    bubble(d, (86, 112))
    d.text((150, 92), "말동무", font=dot_font(76), fill=CORAL)
    draw_runs(d, (84, 210), [("설레는 ", False), ("가상 연애", True), ("부터", False)], font("Bold", 56))
    draw_runs(d, (84, 276), [("100만 이웃과의 수다까지", False)], font("Bold", 56))
    d.text((84, 372), "욕쟁이 할매·판사·해녀 — 진짜 같은 AI 페르소나와 대화", font=font("Regular", 27), fill=BROWN_SOFT)
    phone(im, RAW / "01-dating.png", (706, 8, 300), border=8, radius=34)
    im.save(OUT / "feature-graphic.png", optimize=True)
    print("wrote feature-graphic.png")


if __name__ == "__main__":
    for raw, out, label, head, subs in SHOTS:
        screenshot(raw, out, label, head, subs)
    feature_graphic()
