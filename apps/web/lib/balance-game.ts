import { translate, type Lang } from "./i18n";

type BalanceQuestion = { question: string; options: readonly [string, string] };

export const BALANCE_QUESTIONS: readonly BalanceQuestion[] = [
  { question: "하나를 평생 포기해야 한다면?", options: ["커피 포기", "야식 포기"] },
  { question: "내일 갑자기 쉬는 날이 생긴다면?", options: ["집에서 뒹굴뒹굴", "일단 밖으로 여행"] },
  { question: "친구에게 고민을 털어놓는다면?", options: ["일단 내 편 들어주기", "솔직한 해결책 주기"] },
  { question: "딱 하나의 능력을 가질 수 있다면?", options: ["과거로 10분 돌아가기", "미래를 10분 미리 보기"] },
  { question: "매일 같이 밥을 먹을 사람은?", options: ["입맛이 꼭 맞는 사람", "대화가 꼭 맞는 사람"] },
];

export function balanceMessage(question: BalanceQuestion, choice: 0 | 1, lang: Lang): string {
  return translate(lang, '밸런스 게임 해요! {question}\n선택지는 "{first}" 또는 "{second}"예요. 저는 "{choice}" 쪽이에요. 당신은 어느 쪽이에요? 고른 이유도 궁금해요.', {
    question: translate(lang, question.question),
    first: translate(lang, question.options[0]),
    second: translate(lang, question.options[1]),
    choice: translate(lang, question.options[choice]),
  });
}
