"""Play 스토어 아이콘 A/B 후보 생성 (512×512). 기존 아이콘(코랄 바탕 + 흰 도트 말풍선)과 같은 16px 픽셀 그리드 스타일.

  python3 scripts/store/icons.py  → docs/store/images/icon-variants/icon-{heart,duo}.png
A(heart): 말풍선 안에 코랄 하트 — "연애" 훅을 아이콘에서 바로 전달
B(duo):  브라운 바탕에 크림·코랄 말풍선 둘 + 작은 하트 — "둘이 대화, 마음이 오감" (Play 흰 카드 위 대비)
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / "docs/store/images/icon-variants"
CORAL, CORAL_DEEP, CREAM, PAPER, BROWN, SAND = (232, 97, 60), (218, 84, 48), (253, 246, 239), (253, 251, 246), (61, 43, 31), (243, 231, 216)
S = 32  # 1 픽셀 = 32px → 16×16 그리드

def px(d, x, y, w, h, color):
    d.rectangle([x * S, y * S, (x + w) * S - 1, (y + h) * S - 1], fill=color)

def bubble(d, x, y, color, tail="left"):
    """7×5 픽셀 말풍선 + 꼬리 (기존 아이콘의 계단식 모서리 유지)"""
    px(d, x + 1, y, 5, 1, color); px(d, x, y + 1, 7, 3, color); px(d, x + 1, y + 4, 5, 1, color)
    if tail == "left": px(d, x + 1, y + 5, 1, 1, color)
    else: px(d, x + 5, y + 5, 1, 1, color)

def heart(d, x, y, color):
    """5×4 픽셀 하트"""
    px(d, x, y, 2, 1, color); px(d, x + 3, y, 2, 1, color)
    px(d, x, y + 1, 5, 1, color); px(d, x + 1, y + 2, 3, 1, color); px(d, x + 2, y + 3, 1, 1, color)

def icon_heart():
    im = Image.new("RGB", (512, 512), CORAL); d = ImageDraw.Draw(im)
    d.ellipse([288, 288, 700, 700], fill=CORAL_DEEP)  # 기존 아이콘의 우하단 원
    # 흰 말풍선 9×7 (기존 위치), 안에 5×4 하트를 사방 1px 여백 두고 배치
    px(d, 5, 4, 7, 1, PAPER); px(d, 4, 5, 9, 5, PAPER); px(d, 5, 10, 7, 1, PAPER); px(d, 5, 11, 1, 1, PAPER)
    heart(d, 6, 6, CORAL)
    im.save(OUT / "icon-heart.png", optimize=True)

def icon_duo():
    im = Image.new("RGB", (512, 512), BROWN); d = ImageDraw.Draw(im)
    d.ellipse([-120, 300, 260, 680], fill=(78, 56, 42))
    bubble(d, 2, 3, PAPER, "left")           # 왼쪽 위: 크림, 가운데 줄에 코랄 점 3개
    px(d, 3, 5, 1, 1, CORAL); px(d, 5, 5, 1, 1, CORAL); px(d, 7, 5, 1, 1, CORAL)
    bubble(d, 7, 8, CORAL, "right")          # 오른쪽 아래: 코랄, 안에 작은 3×3 크림 하트
    px(d, 9, 9, 1, 1, PAPER); px(d, 11, 9, 1, 1, PAPER); px(d, 9, 10, 3, 1, PAPER); px(d, 10, 11, 1, 1, PAPER)
    im.save(OUT / "icon-duo.png", optimize=True)

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    icon_heart(); icon_duo(); print("wrote", OUT)
