"use client";

import { useRouter } from "next/navigation";

export default function QuotaSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="dot-title" style={{ marginBottom: 6 }}>
          말동무 서비스 어땠어요?
        </h2>
        <p style={{ fontSize: 14, margin: "0 0 18px", lineHeight: 1.7 }}>
          벌써 대화를 100번이나 나누셨어요! 여기까지 함께해주셔서 정말 고마워요.
          <br />
          서비스가 어땠는지 피드백을 들려주시면, 확인하는 대로 대화를 더 나눌 수 있게
          넉넉히 열어드릴게요.
        </p>
        <button className="btn-cta" onClick={() => router.push("/feedback")}>
          피드백 남기고 더 대화하기
        </button>
        <button
          className="btn-ghost"
          style={{ width: "100%", marginTop: 10, border: "none" }}
          onClick={onClose}
        >
          다음에 할게요
        </button>
      </div>
    </div>
  );
}
