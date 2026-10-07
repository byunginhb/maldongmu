/**
 * 화면 문구 다국어 — 키는 한국어 원문, 값은 번역. 한국어는 키 그대로, 없는 번역은 영어 → 한국어 순으로 대체.
 * 언어는 서버 레이아웃이 Accept-Language로 정해 LangProvider로 내려준다(SSR·클라이언트 동일 → 깜빡임 없음).
 * 페르소나 데이터(이름·직업·소개)는 한국어 콘텐츠라 번역하지 않는다. AI 답변은 base.md 규칙대로 사용자 언어를 따른다.
 */
export type Lang = "ko" | "en" | "ja";

export function pickLang(accept?: string | null): Lang {
  const first = (accept || "").split(",")[0].trim().toLowerCase();
  if (first.startsWith("ko")) return "ko";
  if (first.startsWith("ja")) return "ja";
  if (!first) return "ko";
  return "en";
}

type Dict = Record<string, string>;

const en: Dict = {
  // 탭바
  "홈": "Home", "검색": "Search", "만남": "Meet", "인터뷰": "Interview", "이웃 수첩": "Notebook",
  // 홈
  "오늘은 누구랑 얘기할까요?": "Who will you talk to today?", "서비스 소개 →": "About →",
  "제주의 해녀부터 여든의 시인까지 — {b}이 기다리고 있어요": "From Jeju sea divers to an 80-year-old poet — {b} are waiting",
  "평소엔 만나기 어려운 100만 명의 이웃": "1,000,000 neighbors you'd never meet",
  "스무 살의 고민부터 일흔의 지혜까지 — {b}가 여기선 어렵지 않아요": "From a twenty-year-old's worries to a seventy-year-old's wisdom — {b} is easy here",
  "다른 세대와의 대화": "talking across generations",
  "설레는 첫 만남, 지금 바로": "A first date, right now", "성별과 나이대만 고르면 소개팅 자리로 안내해드려요": "Pick a gender and an age range — we seat you at a quiet café",
  "여자": "Woman", "남자": "Man", "20대": "20s", "30대": "30s", "40대": "40s", "50대 이상": "50+",
  "바로 소개받기": "Start a blind date", "소개할 분을 찾는 중...": "Finding someone for you...", "직접 골라서 만나기 →": "Choose someone yourself →",
  "먼저 성별과 나이대를 골라주세요": "Pick a gender and an age range first", "소개할 분을 찾지 못했어요. 잠시 후 다시 시도해주세요.": "Couldn't find a match. Please try again in a moment.",
  "욕쟁이 할매": "Cursing Grandmas", "지역별 할매한테 한바탕 타박 들으러 가기": "Get scolded by a grandma from every region",
  "인연을 찾는 중...": "Finding a match...", "오늘의 인연 만나기": "Meet today's match", "어떤 이웃을 만날지는 눌러봐야 알아요": "You won't know who until you tap",
  "오늘의 이웃": "Today's neighbors", "매일 새로운 이웃을 소개해드려요": "New neighbors introduced every day",
  "요즘 이런 고민이 있다면": "Something on your mind?", "골라주시면 어울리는 말동무를 찾아드려요": "Pick one and we'll find the right companion",
  "일·직장": "Work", "연애·썸": "Love", "가족": "Family", "친구·관계": "Friends", "돈·미래": "Money", "건강·체력": "Health", "공부·진로": "Study", "외로움·수다": "Lonely",
  "요즘 인기": "Popular now", "이번 주에 대화가 많았던 이웃들이에요": "Neighbors people talked to most this week",
  "친구들을 부르고 있어요…": "Calling your friends…", "오늘의 친구 2명과 같이 놀기": "Hang out with today's two friends", "나이는 달라도, 수다는 함께. 나까지 셋이서!": "Different ages, one chat. Three of us!",
  "친구들을 만나지 못했어요. 잠시 후 다시 시도해주세요.": "Couldn't reach your friends. Please try again.",
  "말동무 앱으로 더 편하게": "Easier in the Maldongmu app", "Play에서 받기": "Get it on Play", "닫기": "Close",
  // 가상 연애
  "← 홈": "← Home", "가상 연애": "Virtual Dating", "설레는 첫 만남, 미리 연습해볼까요?": "Practice a first date, without the nerves",
  "만나고 싶은 분의 성별과 나이대만 골라주세요. 소개팅 자리로 안내해드릴게요.": "Just pick a gender and an age range. We'll seat you at a blind date.",
  "어떤 분을 만나볼까요?": "Who would you like to meet?", "나이대": "Age range", "소개받기": "Find a match",
  "이런 분들이 기다리고 있어요": "These people are waiting", "마음이 가는 분을 고르면 바로 첫 만남이 시작돼요.": "Tap someone and the date begins.",
  "만나기 →": "Meet →", "조건에 맞는 분을 찾지 못했어요. 다른 나이대를 골라볼까요?": "No one matched. Try another age range?", "찾는 중...": "Finding...", "다른 분 소개받기": "Show me others",
  "만남을 시작하지 못했어요. 다시 시도해주세요.": "Couldn't start the date. Please try again.", "{age}세": "{age}",
  // 채팅
  "첫 만남이에요. 편하게 말을 건네보세요.": "It's your first meeting. Say hello.", "오늘 있었던 소소한 일": "Something small from today", "평생 한 가지 음식만 먹는다면?": "One food for the rest of your life?", "요즘 나를 웃게 하는 것": "What makes me laugh lately",
  "이웃 수첩으로": "To notebook", "대화 불러오는 중": "Loading…", "나까지 셋이서 수다": "Three-way chat", "가상 연애 · ": "Dating · ", "잠시만 기다려주세요": "One moment", "+ 친구 초대": "+ Invite",
  "친구들이 짧게 이야기한 뒤 기다려요. 언제든 끼어들어도 좋아요.": "Your friends chat briefly, then wait. Jump in any time.", "대화 내용": "Conversation", "대화를 불러오고 있어요…": "Loading the conversation…",
  "말동무의 친구들은 AI 페르소나예요": "Maldongmu's friends are AI personas", "{name}님이 기다리고 있어요.": "{name} is waiting.", "먼저 인사를 건네볼까요?": "Why not say hello first?",
  "이 답변 신고하기": "Report this reply", "신고": "Report", "이런 이야기로 시작해볼까요?": "Start with one of these?", "친구들이 말을 멈추고 있어요…": "Friends are pausing…", "친구들이 이야기 중이에요": "Friends are talking", "이제 당신 이야기를 들려주세요": "Your turn now", "나도 한마디": "Let me in",
  "메시지": "Message", "한마디 보내고 대화에 끼어들기": "Send a line to jump in", "메시지를 입력해주세요": "Type a message", "끼어들어 보내기": "Send and jump in", "보내기": "Send",
  "대화를 불러오지 못했어요. 새로고침해 다시 연결해주세요.": "Couldn't load the conversation. Refresh to reconnect.", "대화가 멈췄는지 확인하지 못했어요. 잠시 후 다시 시도해주세요.": "Couldn't confirm the pause. Try again shortly.",
  "아직 대화가 멈추지 않았어요. 잠시 후 다시 보내주세요.": "Still finishing up. Send again in a moment.", "연결을 잠시 쉬고 있어요. 다시 이야기해주세요.": "Connection is resting. Please try again.",
  "링크를 복사했어요": "Link copied", "공유 링크를 만들지 못했어요": "Couldn't create a share link", "{name}님의 호감도 {score} · {stage} — 말동무 가상 연애": "{name}'s affection {score} · {stage} — Maldongmu virtual dating",
  "호감도 달성": "Milestone", "호감도 {m} 달성!": "Affection {m} reached!", "{name}님의 마음이 {stage}. 이 순간을 카드로 남겨 친구에게 자랑해볼까요?": "{name} is {stage}. Share this moment as a card?", "결과 카드 공유하기": "Share the card", "계속 이야기하기": "Keep talking",
  "호감도 · {stage}": "Affection · {stage}", "공유": "Share", "호감도 {score}점, {stage}": "Affection {score}, {stage}",
  "아직은 서먹해요": "still a bit awkward", "조금 궁금해요": "a little curious", "편해지는 중": "warming up", "설레는 중": "fluttering", "마음이 기울었어요": "falling for you",
  // 시트
  "가입하고 계속 이야기 나눠요": "Sign in to keep talking", "가입하면 지금까지 나눈 대화와 가상 연애의 호감도가 그대로 저장되고, 이웃 수첩에서 언제든 이어서 만날 수 있어요. 아직은 모두 무료예요.": "Signing in saves your conversations and affection scores so you can pick up any time from your notebook. Everything is free for now.",
  "카카오로 계속하기": "Continue with Kakao", "구글로 계속하기": "Continue with Google", "다음에 할게요": "Maybe later", "로그인하면 {terms}과 {privacy}에 동의하게 돼요.": "By signing in you agree to the {terms} and {privacy}.", "이용약관": "Terms", "개인정보처리방침": "Privacy Policy",
  "말동무 서비스 어땠어요?": "How is Maldongmu so far?", "벌써 대화를 100번이나 나누셨어요! 여기까지 함께해주셔서 정말 고마워요.": "You've already sent 100 messages — thank you for being here.", "서비스가 어땠는지 피드백을 들려주시면, 확인하는 대로 대화를 더 나눌 수 있게 넉넉히 열어드릴게요.": "Tell us how it's been and we'll open up more messages for you as soon as we read it.", "피드백 남기고 더 대화하기": "Leave feedback and keep talking",
  "말동무, 마음에 드셨나요?": "Enjoying Maldongmu?", "별점 하나가 더 많은 분께 말동무를 소개해줘요. 30초면 충분해요.": "A rating helps more people find us. It takes 30 seconds.", "별점 남기러 가기": "Rate the app",
  "대화 한도가 늘었어요": "Your message limit went up", "피드백 고마워요! 이제 메시지를 {limit}개까지 나눌 수 있어요. 기다리던 이웃들이 있을 거예요.": "Thanks for the feedback! You can now send up to {limit} messages. Your neighbors are waiting.", "이어서 이야기하기": "Continue talking",
  "AI 답변 신고": "Report AI reply", "신고가 접수됐어요": "Report received", "알려주셔서 고마워요. 확인 후 필요한 조치를 할게요.": "Thank you. We'll review it and take action.", "이 답변을 신고할까요?": "Report this reply?", "불쾌하거나 부적절한 AI 답변을 알려주시면 확인 후 조치할게요.": "Tell us about offensive or inappropriate AI replies and we'll review them.",
  "성적인 내용": "Sexual content", "폭력·혐오 표현": "Violence or hate", "개인정보·사칭": "Privacy or impersonation", "기타": "Other", "자세한 내용 (선택)": "Details (optional)", "신고 상세 (선택)": "Report details (optional)", "보내는 중...": "Sending...", "신고하기": "Report", "취소": "Cancel", "신고를 보내지 못했어요. 잠시 후 다시 시도해주세요.": "Couldn't send the report. Please try again.",
  // 친구 초대
  "같이 놀 친구 한 명": "One friend to join", "나이 상관없이, 마음 가는 친구를 골라주세요.": "Any age — pick whoever you like.", "친구 선택 닫기": "Close", "함께할 친구 검색": "Search friends", "이름, 직업, 취미로 찾아보기": "Name, job, hobby…", "친구를 찾고 있어요…": "Searching…", "검색어를 바꿔볼까요?": "Try another search?", "이전": "Prev", "{page}쪽": "p.{page}", "다음": "Next",
  "초대하면 지금까지 나눈 이야기를 함께 이어가요. 친구는 두 명까지 함께할 수 있어요.": "Invited friends join the conversation so far. Up to two friends.", "초대하는 중…": "Inviting…", "{name}님 초대하기": "Invite {name}", "친구 한 명을 골라주세요": "Pick a friend",
  "친구 목록을 불러오지 못했어요. 검색어를 바꾸거나 다시 열어주세요.": "Couldn't load friends. Try another search or reopen.", "초대하지 못했어요. 다시 시도해주세요.": "Couldn't invite. Please try again.",
  // 이웃 수첩
  "둘러보는 중이에요 (메시지 {used}/{limit}개, 로그인하면 계속)": "Browsing as a guest ({used}/{limit} messages — sign in to keep going)", "{nick}님, 지금까지 {n}명의 이웃을 만났어요": "{nick}, you've met {n} neighbors so far", "지금까지 {n}명의 이웃을 만났어요": "You've met {n} neighbors so far",
  "나눈 이야기를 이어가볼까요?": "Pick up where you left off?", "아직 만난 이웃이 없어요": "No neighbors yet", "오늘 {n}명의 이웃을 새로 만났어요": "You met {n} new neighbors today",
  "대화를 정말 많이 나누셨네요! 서비스가 어땠는지 들려주시면 더 나눌 수 있게 열어드릴게요.": "You've talked a lot! Tell us how it's been and we'll open up more.", "로그인하면 만난 이웃과 대화를 무제한으로 이어갈 수 있어요.": "Sign in to keep talking with the neighbors you've met.",
  "이웃 수첩을 잠시 불러오지 못했어요.": "Couldn't load your notebook.", "다시 시도": "Retry", "셋이서 수다": "Three-way chats", "함께 놀던 친구들이 기다리고 있어요.": "Your friends are waiting.", "나까지 셋이서 · 이어서 이야기하기": "Three of us · continue",
  "설레는 이야기를 이어가볼까요?": "Continue the story?", "{age}세 · {job} · 이어서 만나기": "{age} · {job} · continue", "{name}님과 이어서 이야기하기": "Continue with {name}", "귀한 이웃": "Rare", "새 이웃 만나러 가기": "Meet new neighbors", "새 이웃": "New", "추가해볼까요?": "Add one?",
  "아직 만난 이웃이 없어요.": "No neighbors yet.", "오늘의 이웃을 만나러 가볼까요?": "Meet today's neighbors?", "아직 만나지 못한 이웃도 있어요 →": "Neighbors you haven't met →", "로그아웃": "Sign out",
  // 만남 / 할매 / 검색 / 페르소나
  "만나보고 싶던 사람들": "People you wanted to meet", "평소엔 만나기 어려운 이웃들이에요. 매일 새로운 분이 인사드려요.": "Neighbors you rarely get to meet. A new one every day.", "다른 {label} {n}명 더 보기 →": "{n} more {label} →", "아직 소개할 이웃이 없어요. 곧 찾아뵐게요.": "No one to introduce yet. Soon.",
  "입은 걸어도 속은 따뜻한 우리 동네 할매들": "Sharp tongues, soft hearts", "지역을 골라 앉으면, 한바탕 타박부터 시작이에요. 그래도 밥은 꼭 챙겨 주실 거예요.": "Pick a region and brace for a scolding — she'll still make sure you've eaten.", "{name} 할매 · {age}세": "Grandma {name} · {age}", "대화 →": "Talk →",
  "이웃 찾기": "Find neighbors", "어떤 이웃을 찾으세요?": "Who are you looking for?", "직업, 취미, 지역, 이름...": "Job, hobby, region, name...", "지역 전체": "All regions", "성별 전체": "Any gender", "전체": "All", "50대": "50s", "60대+": "60+", "조건에 맞는 이웃을 찾지 못했어요. 검색어를 바꿔볼까요?": "No neighbors matched. Try another search?",
  "← 뒤로": "← Back", "연결하는 중...": "Connecting...", "{name}님과 대화 시작하기": "Talk with {name}",
  "성격과 배경": "Personality & background", "일": "Work", "취미": "Hobbies", "잘하는 것": "Skills", "여가와 운동": "Leisure & sports", "문화 생활": "Culture", "여행": "Travel", "음식": "Food", "앞으로의 꿈": "Dreams",
  "말동무의 모든 인물은 한국의 실제 인구 통계 데이터를 바탕으로 만들어진 AI 페르소나예요. 특정 실존 인물과는 무관해요.": "Every persona in Maldongmu is generated from real Korean population statistics. None is a real person.",
  // 공유 카드
  "말동무 가상 연애 결과": "Maldongmu virtual dating result", "{name}님의 호감도 {score}": "{name}'s affection {score}", "속마음: {note}": "Inner voice: {note}", "성별과 나이대만 고르면 나도 소개팅 시작": "Pick a gender and age range to start your own date", "나도 소개받기": "Start my own date", "100만 한국인 AI 페르소나와 진짜 같은 대화 · 말동무": "Real-feeling chats with 1M Korean AI personas · Maldongmu",
  // 푸터
  "둘러보기": "Explore", "판사와 대화": "Judges", "소방관과 대화": "Firefighters", "해녀와 대화": "Sea divers", "조종사와 대화": "Pilots", "승려와 대화": "Monks", "천문학자와 대화": "Astronomers", "배우와 대화": "Actors", "작가와 대화": "Writers", "국악인과 대화": "Gugak musicians", "항해사와 대화": "Navigators",
  "서비스 소개": "About", "말동무의 모든 인물은 한국의 실제 데이터를 기반으로 만들어진 페르소나입니다. (특정 실존 인물과는 무관해요)": "Every persona is generated from real Korean data. (None is a real person.)",
};

const ja: Dict = {
  "홈": "ホーム", "검색": "検索", "만남": "出会い", "인터뷰": "インタビュー", "이웃 수첩": "ご近所ノート",
  "오늘은 누구랑 얘기할까요?": "今日は誰と話しますか？", "서비스 소개 →": "サービス紹介 →",
  "제주의 해녀부터 여든의 시인까지 — {b}이 기다리고 있어요": "済州の海女から八十歳の詩人まで — {b}が待っています", "평소엔 만나기 어려운 100만 명의 이웃": "普段は会えない100万人の隣人",
  "스무 살의 고민부터 일흔의 지혜까지 — {b}가 여기선 어렵지 않아요": "二十歳の悩みから七十歳の知恵まで — {b}がここでは難しくありません", "다른 세대와의 대화": "世代を越えた会話",
  "설레는 첫 만남, 지금 바로": "ときめく初対面、今すぐ", "성별과 나이대만 고르면 소개팅 자리로 안내해드려요": "性別と年代を選ぶだけでお見合いの席へご案内",
  "여자": "女性", "남자": "男性", "20대": "20代", "30대": "30代", "40대": "40代", "50대 이상": "50代以上",
  "바로 소개받기": "すぐに紹介してもらう", "소개할 분을 찾는 중...": "お相手を探しています...", "직접 골라서 만나기 →": "自分で選んで会う →",
  "먼저 성별과 나이대를 골라주세요": "先に性別と年代を選んでください", "소개할 분을 찾지 못했어요. 잠시 후 다시 시도해주세요.": "お相手が見つかりませんでした。しばらくしてからもう一度お試しください。",
  "욕쟁이 할매": "毒舌おばあちゃん", "지역별 할매한테 한바탕 타박 들으러 가기": "地方ごとのおばあちゃんに叱られに行く",
  "인연을 찾는 중...": "縁を探しています...", "오늘의 인연 만나기": "今日の縁に会う", "어떤 이웃을 만날지는 눌러봐야 알아요": "誰に会うかは押してみてのお楽しみ",
  "오늘의 이웃": "今日のご近所さん", "매일 새로운 이웃을 소개해드려요": "毎日新しい隣人を紹介します",
  "요즘 이런 고민이 있다면": "最近こんな悩みがあるなら", "골라주시면 어울리는 말동무를 찾아드려요": "選ぶと合う話し相手を探します",
  "일·직장": "仕事", "연애·썸": "恋愛", "가족": "家族", "친구·관계": "友だち", "돈·미래": "お金", "건강·체력": "健康", "공부·진로": "勉強", "외로움·수다": "寂しさ",
  "요즘 인기": "いま人気", "이번 주에 대화가 많았던 이웃들이에요": "今週よく話された隣人たち",
  "친구들을 부르고 있어요…": "友だちを呼んでいます…", "오늘의 친구 2명과 같이 놀기": "今日の友だち2人と遊ぶ", "나이는 달라도, 수다는 함께. 나까지 셋이서!": "年は違っても、おしゃべりは一緒。私も入れて三人で！",
  "친구들을 만나지 못했어요. 잠시 후 다시 시도해주세요.": "友だちに会えませんでした。しばらくしてからお試しください。",
  "말동무 앱으로 더 편하게": "アプリでもっと快適に", "Play에서 받기": "Playで入手", "닫기": "閉じる",
  "← 홈": "← ホーム", "가상 연애": "恋愛シミュレーション", "설레는 첫 만남, 미리 연습해볼까요?": "ときめく初対面、先に練習してみませんか？",
  "만나고 싶은 분의 성별과 나이대만 골라주세요. 소개팅 자리로 안내해드릴게요.": "会いたい相手の性別と年代を選ぶだけ。お見合いの席へご案内します。",
  "어떤 분을 만나볼까요?": "どんな方に会いますか？", "나이대": "年代", "소개받기": "紹介してもらう",
  "이런 분들이 기다리고 있어요": "こんな方々が待っています", "마음이 가는 분을 고르면 바로 첫 만남이 시작돼요.": "気になる方を選ぶとすぐに初対面が始まります。",
  "만나기 →": "会う →", "조건에 맞는 분을 찾지 못했어요. 다른 나이대를 골라볼까요?": "条件に合う方が見つかりません。別の年代を選んでみますか？", "찾는 중...": "探しています...", "다른 분 소개받기": "別の方を紹介してもらう",
  "만남을 시작하지 못했어요. 다시 시도해주세요.": "出会いを始められませんでした。もう一度お試しください。", "{age}세": "{age}歳",
  "첫 만남이에요. 편하게 말을 건네보세요.": "初対面です。気軽に話しかけてみましょう。", "오늘 있었던 소소한 일": "今日あったささいなこと", "평생 한 가지 음식만 먹는다면?": "一生ひとつの食べ物だけなら？", "요즘 나를 웃게 하는 것": "最近私を笑わせるもの",
  "이웃 수첩으로": "ノートへ", "대화 불러오는 중": "読み込み中", "나까지 셋이서 수다": "三人でおしゃべり", "가상 연애 · ": "恋愛 · ", "잠시만 기다려주세요": "少々お待ちください", "+ 친구 초대": "+ 友だちを招待",
  "친구들이 짧게 이야기한 뒤 기다려요. 언제든 끼어들어도 좋아요.": "友だちが短く話してから待ちます。いつでも割り込んでOK。", "대화 내용": "会話", "대화를 불러오고 있어요…": "会話を読み込んでいます…",
  "말동무의 친구들은 AI 페르소나예요": "マルドンムの友だちはAIペルソナです", "{name}님이 기다리고 있어요.": "{name}さんが待っています。", "먼저 인사를 건네볼까요?": "先に挨拶してみましょうか？",
  "이 답변 신고하기": "この返答を報告", "신고": "報告", "이런 이야기로 시작해볼까요?": "こんな話題から始めますか？", "친구들이 말을 멈추고 있어요…": "友だちが話を止めています…", "친구들이 이야기 중이에요": "友だちが話しています", "이제 당신 이야기를 들려주세요": "今度はあなたの番です", "나도 한마디": "私も一言",
  "메시지": "メッセージ", "한마디 보내고 대화에 끼어들기": "一言送って会話に入る", "메시지를 입력해주세요": "メッセージを入力", "끼어들어 보내기": "割り込んで送信", "보내기": "送信",
  "대화를 불러오지 못했어요. 새로고침해 다시 연결해주세요.": "会話を読み込めませんでした。更新して再接続してください。", "대화가 멈췄는지 확인하지 못했어요. 잠시 후 다시 시도해주세요.": "停止を確認できませんでした。しばらくしてからお試しください。",
  "아직 대화가 멈추지 않았어요. 잠시 후 다시 보내주세요.": "まだ会話が止まっていません。少し待ってから送ってください。", "연결을 잠시 쉬고 있어요. 다시 이야기해주세요.": "接続が一時休止中です。もう一度お話しください。",
  "링크를 복사했어요": "リンクをコピーしました", "공유 링크를 만들지 못했어요": "共有リンクを作成できませんでした", "{name}님의 호감도 {score} · {stage} — 말동무 가상 연애": "{name}さんの好感度 {score} · {stage} — マルドンム恋愛シミュ",
  "호감도 달성": "好感度達成", "호감도 {m} 달성!": "好感度{m}達成！", "{name}님의 마음이 {stage}. 이 순간을 카드로 남겨 친구에게 자랑해볼까요?": "{name}さんの気持ちは「{stage}」。この瞬間をカードにして友だちに自慢しませんか？", "결과 카드 공유하기": "結果カードを共有", "계속 이야기하기": "話を続ける",
  "호감도 · {stage}": "好感度 · {stage}", "공유": "共有", "호감도 {score}점, {stage}": "好感度{score}点、{stage}",
  "아직은 서먹해요": "まだぎこちない", "조금 궁금해요": "少し気になる", "편해지는 중": "打ち解けてきた", "설레는 중": "ときめき中", "마음이 기울었어요": "心が傾いた",
  "가입하고 계속 이야기 나눠요": "登録して話を続けましょう", "가입하면 지금까지 나눈 대화와 가상 연애의 호감도가 그대로 저장되고, 이웃 수첩에서 언제든 이어서 만날 수 있어요. 아직은 모두 무료예요.": "登録すると会話と好感度が保存され、ノートからいつでも続きを楽しめます。今はすべて無料です。",
  "카카오로 계속하기": "カカオで続ける", "구글로 계속하기": "Googleで続ける", "다음에 할게요": "また今度", "로그인하면 {terms}과 {privacy}에 동의하게 돼요.": "ログインすると{terms}と{privacy}に同意したことになります。", "이용약관": "利用規約", "개인정보처리방침": "プライバシーポリシー",
  "말동무 서비스 어땠어요?": "マルドンムはいかがでしたか？", "벌써 대화를 100번이나 나누셨어요! 여기까지 함께해주셔서 정말 고마워요.": "もう100回も会話されました！ここまでご一緒いただきありがとうございます。", "서비스가 어땠는지 피드백을 들려주시면, 확인하는 대로 대화를 더 나눌 수 있게 넉넉히 열어드릴게요.": "ご感想を送っていただければ、確認次第メッセージ枠を増やします。", "피드백 남기고 더 대화하기": "フィードバックを送って続ける",
  "말동무, 마음에 드셨나요?": "マルドンム、気に入りましたか？", "별점 하나가 더 많은 분께 말동무를 소개해줘요. 30초면 충분해요.": "評価ひとつでより多くの方に届きます。30秒で終わります。", "별점 남기러 가기": "評価する",
  "대화 한도가 늘었어요": "メッセージ上限が増えました", "피드백 고마워요! 이제 메시지를 {limit}개까지 나눌 수 있어요. 기다리던 이웃들이 있을 거예요.": "フィードバックありがとうございます！メッセージを{limit}件まで送れます。", "이어서 이야기하기": "続きを話す",
  "AI 답변 신고": "AI返答を報告", "신고가 접수됐어요": "報告を受け付けました", "알려주셔서 고마워요. 확인 후 필요한 조치를 할게요.": "ありがとうございます。確認のうえ対応します。", "이 답변을 신고할까요?": "この返答を報告しますか？", "불쾌하거나 부적절한 AI 답변을 알려주시면 확인 후 조치할게요.": "不快・不適切なAI返答をお知らせください。確認して対応します。",
  "성적인 내용": "性的な内容", "폭력·혐오 표현": "暴力・ヘイト", "개인정보·사칭": "個人情報・なりすまし", "기타": "その他", "자세한 내용 (선택)": "詳細（任意）", "신고 상세 (선택)": "報告の詳細（任意）", "보내는 중...": "送信中...", "신고하기": "報告する", "취소": "キャンセル", "신고를 보내지 못했어요. 잠시 후 다시 시도해주세요.": "報告を送れませんでした。しばらくしてからお試しください。",
  "같이 놀 친구 한 명": "一緒に遊ぶ友だち一人", "나이 상관없이, 마음 가는 친구를 골라주세요.": "年齢問わず、気になる友だちを選んでください。", "친구 선택 닫기": "閉じる", "함께할 친구 검색": "友だちを検索", "이름, 직업, 취미로 찾아보기": "名前・職業・趣味で探す", "친구를 찾고 있어요…": "探しています…", "검색어를 바꿔볼까요?": "別の言葉で探しますか？", "이전": "前へ", "{page}쪽": "{page}ページ", "다음": "次へ",
  "초대하면 지금까지 나눈 이야기를 함께 이어가요. 친구는 두 명까지 함께할 수 있어요.": "招待するとこれまでの会話を一緒に続けます。友だちは二人まで。", "초대하는 중…": "招待中…", "{name}님 초대하기": "{name}さんを招待", "친구 한 명을 골라주세요": "友だちを一人選んでください",
  "친구 목록을 불러오지 못했어요. 검색어를 바꾸거나 다시 열어주세요.": "友だち一覧を読み込めませんでした。", "초대하지 못했어요. 다시 시도해주세요.": "招待できませんでした。もう一度お試しください。",
  "둘러보는 중이에요 (메시지 {used}/{limit}개, 로그인하면 계속)": "ゲスト利用中（メッセージ {used}/{limit}、ログインで継続）", "{nick}님, 지금까지 {n}명의 이웃을 만났어요": "{nick}さん、これまで{n}人の隣人に会いました", "지금까지 {n}명의 이웃을 만났어요": "これまで{n}人の隣人に会いました",
  "나눈 이야기를 이어가볼까요?": "続きを話しますか？", "아직 만난 이웃이 없어요": "まだ会った隣人がいません", "오늘 {n}명의 이웃을 새로 만났어요": "今日{n}人の隣人に新しく会いました",
  "대화를 정말 많이 나누셨네요! 서비스가 어땠는지 들려주시면 더 나눌 수 있게 열어드릴게요.": "たくさん話されましたね！ご感想を送っていただければ枠を増やします。", "로그인하면 만난 이웃과 대화를 무제한으로 이어갈 수 있어요.": "ログインすると会った隣人と会話を続けられます。",
  "이웃 수첩을 잠시 불러오지 못했어요.": "ノートを読み込めませんでした。", "다시 시도": "再試行", "셋이서 수다": "三人おしゃべり", "함께 놀던 친구들이 기다리고 있어요.": "一緒に遊んだ友だちが待っています。", "나까지 셋이서 · 이어서 이야기하기": "三人で · 続きを話す",
  "설레는 이야기를 이어가볼까요?": "ときめく話の続きを？", "{age}세 · {job} · 이어서 만나기": "{age}歳 · {job} · 続きを", "{name}님과 이어서 이야기하기": "{name}さんと続きを話す", "귀한 이웃": "レア", "새 이웃 만나러 가기": "新しい隣人に会う", "새 이웃": "新しい隣人", "추가해볼까요?": "追加しますか？",
  "아직 만난 이웃이 없어요.": "まだ会った隣人がいません。", "오늘의 이웃을 만나러 가볼까요?": "今日のご近所さんに会いに行きますか？", "아직 만나지 못한 이웃도 있어요 →": "まだ会っていない隣人も →", "로그아웃": "ログアウト",
  "만나보고 싶던 사람들": "会ってみたかった人たち", "평소엔 만나기 어려운 이웃들이에요. 매일 새로운 분이 인사드려요.": "普段は会えない隣人たち。毎日新しい方が挨拶します。", "다른 {label} {n}명 더 보기 →": "他の{label}{n}人を見る →", "아직 소개할 이웃이 없어요. 곧 찾아뵐게요.": "まだ紹介できる隣人がいません。",
  "입은 걸어도 속은 따뜻한 우리 동네 할매들": "口は悪くても心は温かいおばあちゃんたち", "지역을 골라 앉으면, 한바탕 타박부터 시작이에요. 그래도 밥은 꼭 챙겨 주실 거예요.": "地域を選んで座ると、まずはひと叱り。それでもご飯はちゃんと心配してくれます。", "{name} 할매 · {age}세": "{name}おばあちゃん · {age}歳", "대화 →": "話す →",
  "이웃 찾기": "隣人を探す", "어떤 이웃을 찾으세요?": "どんな隣人を探しますか？", "직업, 취미, 지역, 이름...": "職業・趣味・地域・名前...", "지역 전체": "全地域", "성별 전체": "性別すべて", "전체": "すべて", "50대": "50代", "60대+": "60代+", "조건에 맞는 이웃을 찾지 못했어요. 검색어를 바꿔볼까요?": "条件に合う隣人が見つかりません。別の言葉で探しますか？",
  "← 뒤로": "← 戻る", "연결하는 중...": "接続中...", "{name}님과 대화 시작하기": "{name}さんと話す",
  "성격과 배경": "性格と背景", "일": "仕事", "취미": "趣味", "잘하는 것": "得意なこと", "여가와 운동": "余暇と運動", "문화 생활": "文化生活", "여행": "旅行", "음식": "食べ物", "앞으로의 꿈": "これからの夢",
  "말동무의 모든 인물은 한국의 실제 인구 통계 데이터를 바탕으로 만들어진 AI 페르소나예요. 특정 실존 인물과는 무관해요.": "マルドンムの人物はすべて韓国の実際の人口統計データから作られたAIペルソナです。実在の人物とは無関係です。",
  "말동무 가상 연애 결과": "マルドンム恋愛シミュの結果", "{name}님의 호감도 {score}": "{name}さんの好感度 {score}", "속마음: {note}": "本音: {note}", "성별과 나이대만 고르면 나도 소개팅 시작": "性別と年代を選ぶだけで私もお見合い開始", "나도 소개받기": "私も紹介してもらう", "100만 한국인 AI 페르소나와 진짜 같은 대화 · 말동무": "100万人の韓国人AIペルソナと本物みたいな会話 · マルドンム",
  "둘러보기": "見て回る", "판사와 대화": "裁判官と話す", "소방관과 대화": "消防士と話す", "해녀와 대화": "海女と話す", "조종사와 대화": "パイロットと話す", "승려와 대화": "僧侶と話す", "천문학자와 대화": "天文学者と話す", "배우와 대화": "俳優と話す", "작가와 대화": "作家と話す", "국악인과 대화": "国楽人と話す", "항해사와 대화": "航海士と話す",
  "서비스 소개": "サービス紹介", "말동무의 모든 인물은 한국의 실제 데이터를 기반으로 만들어진 페르소나입니다. (특정 실존 인물과는 무관해요)": "すべての人物は韓国の実データから作られたペルソナです（実在の人物とは無関係）。",
};

const DICT: Record<Lang, Dict> = { ko: {}, en, ja };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const text = DICT[lang][key] ?? (lang === "ja" ? en[key] : undefined) ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : text;
}
