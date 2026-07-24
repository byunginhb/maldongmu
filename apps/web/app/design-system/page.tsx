"use client";

import { useState } from "react";
import Avatar from "../../components/Avatar";
import {
  Button,
  SectionHeader,
  Badge,
  Chip,
  QuoteBlock,
  EmptyState,
  DotDivider,
  Skeleton,
  SkeletonCard,
} from "../../components/ui";

const COLORS = [
  { name: "cream", role: "페이지 배경" },
  { name: "paper", role: "카드 배경" },
  { name: "sand", role: "보조 배경(칩·버블)" },
  { name: "line", role: "테두리·구분선" },
  { name: "coral", role: "주요 액션·활성" },
  { name: "coral-deep", role: "coral hover" },
  { name: "brown", role: "본문 텍스트" },
  { name: "brown-soft", role: "보조 텍스트" },
  { name: "green", role: "성공·온라인" },
  { name: "red", role: "에러·삭제" },
];
const SPACING = [4, 8, 12, 16, 24, 32];
const SAMPLE = [
  { uuid: "ds-haenyeo", name: "김정순", age: 68, sex: "여자", occupation: "해녀", region: "제주 성산" },
  { uuid: "ds-welder", name: "박대현", age: 34, sex: "남자", occupation: "용접공", region: "울산 동구" },
];

function Block({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <SectionHeader title={title} subtitle={sub} />
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  const [chip, setChip] = useState("전체");
  return (
    <main className="page">
      <h1 className="dot-title">말동무 디자인 시스템</h1>
      <p className="meta" style={{ margin: "6px 0 0" }}>
        레트로 픽셀 감성 + 따뜻한 동네 분위기. 픽셀은 아바타·제목·소소한 장식 딱 3곳에만, 나머지는
        모던하고 부드럽게. 화면당 강조(coral)는 1개. 그림자·그라데이션·이모지 남발 금지.
      </p>
      <DotDivider />

      <Block title="색상" sub="텍스트는 brown 계열만 · 순수 검정 금지">
        <div className="ds-grid">
          {COLORS.map((c) => (
            <div key={c.name}>
              <div className="ds-swatch" style={{ background: `var(--${c.name})` }} />
              <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600 }}>{c.name}</p>
              <p className="ds-label">{c.role}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="타이포그래피" sub="도트 폰트는 제목 전용 · 본문은 Pretendard">
        <div className="ds-block">
          <h1 className="dot-title" style={{ margin: 0 }}>페이지 제목 (도트 26px)</h1>
          <h2 className="dot-title" style={{ margin: "10px 0 0" }}>섹션 제목 (도트 18px)</h2>
          <p style={{ margin: "12px 0 0" }}>본문 텍스트입니다. 긴 대화의 가독성이 항상 우선이에요. (Pretendard 15px)</p>
          <p style={{ margin: "6px 0 0", fontWeight: 600 }}>이름·버튼 라벨 (15px / 600)</p>
          <p className="meta" style={{ margin: "6px 0 0" }}>메타 · 나이 · 직업 · 지역 (13px, brown-soft)</p>
        </div>
      </Block>

      <Block title="간격 스케일" sub="4 / 8 / 12 / 16 / 24 / 32px">
        <div className="ds-row" style={{ alignItems: "flex-end" }}>
          {SPACING.map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <div style={{ width: s, height: s, background: "var(--coral)", borderRadius: 3 }} />
              <p className="ds-label">{s}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="버튼" sub="coral CTA는 화면당 1개 원칙">
        <Button onClick={() => {}}>주요 액션 (CTA)</Button>
        <div style={{ marginTop: 10 }}>
          <Button variant="ghost" onClick={() => {}}>보조 버튼 (ghost)</Button>{" "}
          <Button variant="ghost" disabled>비활성</Button>
        </div>
      </Block>

      <Block title="칩 · 뱃지" sub="필터 칩(선택 시 brown) · 상태 뱃지">
        <div className="ds-row">
          {["전체", "구글", "카카오", "게스트"].map((c) => (
            <Chip key={c} active={chip === c} onClick={() => setChip(c)}>{c}</Chip>
          ))}
        </div>
        <div className="ds-row" style={{ marginTop: 12 }}>
          <Badge tone="pos">수용</Badge>
          <Badge tone="neu">중립</Badge>
          <Badge tone="neg">우려</Badge>
        </div>
      </Block>

      <Block title="카드" sub="paper 배경 · line 테두리 · radius 16 · 그림자 없음">
        {SAMPLE.map((p) => (
          <div key={p.uuid} className="card" style={{ marginBottom: 10 }}>
            <Avatar uuid={p.uuid} sex={p.sex} age={p.age} />
            <div style={{ minWidth: 0 }}>
              <p className="card-name">{p.name} <span style={{ fontWeight: 400 }}>· {p.age}세</span></p>
              <p className="card-meta">{p.occupation} · {p.region}</p>
              <p className="card-oneliner">성격 한 줄 소개가 최대 두 줄까지 들어가고 넘치면 말줄임으로 처리됩니다.</p>
            </div>
          </div>
        ))}
      </Block>

      <Block title="아바타" sub="shared 패키지 생성기 · 같은 uuid = 같은 얼굴">
        <div className="ds-row">
          {SAMPLE.concat([{ uuid: "ds-poet", name: "", age: 27, sex: "여자", occupation: "", region: "" }]).map((p) => (
            <Avatar key={p.uuid} uuid={p.uuid} sex={p.sex} age={p.age} size={48} radius={12} />
          ))}
        </div>
      </Block>

      <Block title="스켈레톤 (로딩)" sub="shimmer 애니메이션 · 카드형은 SkeletonCard">
        <SkeletonCard />
        <div style={{ marginTop: 10 }}>
          <Skeleton w="70%" h={14} />
          <Skeleton w="45%" h={12} style={{ marginTop: 8 }} />
        </div>
      </Block>

      <Block title="인용 · 구분선 · 빈 상태">
        <QuoteBlock>“오늘은 누구랑 얘기할까요?” — 다정한 존댓말 카피</QuoteBlock>
        <DotDivider />
        <EmptyState>아직 아무것도 없어요.</EmptyState>
      </Block>

      <Block title="원칙">
        <div className="ds-block">
          <p style={{ margin: 0, color: "var(--green)", fontWeight: 700 }}>Do</p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>여백으로 숨 쉬게 — 카드 사이 12px, 섹션 사이 32px</li>
            <li>다정한 존댓말 카피</li>
            <li>아바타는 항상 shared 생성기 (같은 인물 = 같은 얼굴)</li>
          </ul>
          <p style={{ margin: "14px 0 0", color: "var(--red)", fontWeight: 700 }}>Don&apos;t</p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>게임 HUD(LV·HP·8bit 프레임), 그림자·그라데이션·네온·이모지 남발</li>
            <li>본문에 도트 폰트, 화면당 coral CTA 2개 이상, 순수 검정 텍스트</li>
          </ul>
        </div>
      </Block>
    </main>
  );
}
