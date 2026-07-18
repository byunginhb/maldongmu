# 말동무 DESIGN.md

레트로 픽셀 감성 + 따뜻한 동네 분위기. 게임 UI 요소(레벨, HP, 8bit 프레임)는 쓰지 않는다.
픽셀 감성은 딱 3곳에만: **아바타(도트)**, **제목 타이포(도트 폰트)**, **소소한 장식(구분선·포인트 아이콘)**.
나머지는 모던하고 부드럽게 — 긴 대화의 가독성이 항상 우선.

## 1. Visual Theme & Atmosphere

동네 골목의 오후 햇살 같은 분위기. 크림색 바탕에 코랄 포인트, 딥브라운 텍스트.
전체적으로 밝고 낙낙한 여백. 화면당 강조 요소는 1개만. 촌스러움과 아기자기함의 경계에서
항상 "절제된 쪽"을 고른다. 픽셀 요소가 4곳 이상 보이면 이미 과한 것.

## 2. Color Palette & Roles

| 이름 | Hex | 역할 |
|---|---|---|
| cream | `#FDF6EF` | 페이지 배경 |
| paper | `#FFFFFF` | 카드, 채팅 영역 배경 |
| sand | `#F3E7D8` | 보조 배경(칩, 비활성, 페르소나 버블) |
| line | `#EAD9C9` | 테두리, 구분선 (0.5~1px) |
| coral | `#E8613C` | 주요 액션(버튼), 로고, 활성 탭 — 화면당 1개 원칙 |
| coral-deep | `#B84525` | 코랄 hover/pressed, 코랄 배경 위 보조 |
| brown | `#3D2B1F` | 본문 텍스트 |
| brown-soft | `#8C7361` | 보조 텍스트(직업, 메타 정보) |
| green | `#2E7D5B` | 성공, 온라인 표시 |
| red | `#C4392F` | 에러, 삭제 |

- 텍스트는 brown 계열만. 순수 black/gray 금지.
- coral은 "대화 시작하기" 같은 핵심 CTA 전용. 화면에 코랄 버튼 2개 이상 금지.
- 다크모드는 1차 범위 제외 (추후 brown 반전 팔레트).

## 3. Typography

| 용도 | 폰트 | 크기/굵기 |
|---|---|---|
| 로고, 페이지 제목 | **NeoDunggeunmo(네오둥근모)** — 한글 도트 폰트 | 22~28px |
| 섹션 제목 | NeoDunggeunmo | 17~18px |
| 본문, 채팅 | **Pretendard** | 15~16px / 400, line-height 1.65 |
| 이름·버튼 라벨 | Pretendard | 14~15px / 600 |
| 메타(나이·직업·지역) | Pretendard | 12~13px / 400, brown-soft |

- 도트 폰트는 제목 전용. 본문·채팅·버튼에 절대 쓰지 않는다 (가독성).
- 로딩: NeoDunggeunmo는 CDN(jsdelivr) webfont, Pretendard는 variable webfont.

## 4. Component Stylings

**페르소나 카드**: paper 배경, line 1px 테두리, radius 16px, 패딩 14~16px.
왼쪽에 픽셀 아바타(48~56px, radius 12px), 오른쪽에 이름+나이(15px/600) → 직업·지역(13px, brown-soft)
→ 성격 한줄(14px, 최대 2줄 말줄임). 눌림 상태: scale(0.98) + sand 배경.

**주요 버튼(CTA)**: coral 배경, 흰 텍스트 15px/600, radius 24px(필), 높이 48px, 전체 폭.
hover/pressed는 coral-deep. 그림자 없음.

**보조 버튼**: 투명 배경 + line 테두리, brown 텍스트. 필터 칩: sand 배경, radius 16px,
선택 시 brown 배경 + cream 텍스트.

**채팅 버블**: 사용자 = coral 배경(흰 텍스트), 오른쪽 정렬. 페르소나 = sand 배경(brown 텍스트),
왼쪽 정렬 + 옆에 픽셀 아바타 28px. radius 18px, 말꼬리 없음. 버블 최대 폭 78%.
스트리밍 중엔 커서(▮) 깜빡임 — 유일하게 허용되는 픽셀 장식 애니메이션.

**검색 입력**: paper 배경, line 테두리, radius 24px, 높이 44px, 왼쪽 돋보기 아이콘.

**하단 탭바(모바일)**: paper 배경 + 상단 line, 4탭(홈/검색/만남/내 대화), 활성 탭만 coral.
아이콘은 픽셀 스타일 16px 커스텀 SVG.

**구분선 장식**: 섹션 사이에 4px 정사각형 3개(coral, sand, line)를 점점이 배치 — 도트 감성 포인트.

## 5. Layout Principles

- 모바일 퍼스트: 콘텐츠 폭 100%, 좌우 패딩 20px. 데스크톱: 최대 640px 중앙 정렬(채팅·목록),
  홈 카드 그리드만 2열(≥768px).
- 간격 스케일: 4 / 8 / 12 / 16 / 24 / 32px.
- 터치 타겟 최소 44px. 하단 탭바 높이 56px + safe-area.

## 6. Depth & Elevation

그림자를 쓰지 않는다. 위계는 배경색(cream→paper→sand)과 테두리로만 표현.
유일한 예외: 하단 탭바에 `0 -1px 0 line`.

## 7. Do's and Don'ts

Do:
- 여백으로 숨 쉬게 하기. 카드 사이 12px, 섹션 사이 32px
- 카피는 다정한 존댓말 ("오늘은 누구랑 얘기할까요?", "○○님이 기다리고 있어요")
- 아바타는 항상 shared 패키지의 생성기 사용 (같은 인물 = 같은 얼굴)

Don't:
- 게임 HUD 요소 (LV, HP바, 경험치, 8bit 프레임 테두리)
- 그라데이션, 그림자, 네온, 이모지 남발
- 본문에 도트 폰트
- 화면당 코랄 CTA 2개 이상
- 순수 검정(#000) 텍스트

## 8. Responsive Behavior

| 구간 | 동작 |
|---|---|
| ~767px (기본) | 1열, 하단 탭바 |
| 768px~ | 홈 카드 2열, 콘텐츠 최대 640px |
| 1024px~ | 좌측에 로고+네비 사이드 레일(탭바 대체), 콘텐츠 중앙 |

채팅 화면은 모든 구간에서 1열 유지 (최대 640px).

## 9. Agent Prompt Guide

"cream(#FDF6EF) 배경, coral(#E8613C) CTA 1개, brown(#3D2B1F) 텍스트, 도트 폰트는 제목만,
카드는 paper+line 테두리 radius 16px, 그림자 없음, 픽셀 아바타 필수" — 이 한 줄이 지켜지면 말동무다.
