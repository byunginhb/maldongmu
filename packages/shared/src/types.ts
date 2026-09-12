export interface PersonaCard {
  uuid: string;
  name: string;
  oneLiner: string;
  age: number;
  sex: string;
  occupation: string;
  province: string;
  district: string;
}

export interface PersonaDetail extends PersonaCard {
  professionalPersona: string;
  sportsPersona: string;
  artsPersona: string;
  travelPersona: string;
  culinaryPersona: string;
  familyPersona: string;
  culturalBackground: string;
  skillsAndExpertise: string;
  hobbiesAndInterests: string;
  careerGoalsAndAmbitions: string;
  maritalStatus: string;
  educationLevel: string;
  familyType: string;
  housingType: string;
}

export interface Conversation {
  id: string;
  personaUuid: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  persona?: PersonaCard;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  speakerUuid?: string | null;
  /** 가상 연애: 이 답변 시점의 호감도(0~100)와 상대의 속마음 한 줄 */
  affection?: number | null;
  affectionNote?: string | null;
}

/** Group streams identify every bubble; 1:1 delta/done events stay compatible. */
export type ChatStreamEvent =
  | { type: "speaker"; speakerUuid: string; messageId: string; turn: number; maxTurns: number }
  | { type: "delta"; delta: string }
  | { type: "messageEnd" }
  | { type: "affection"; score: number; change: number; note: string } // change: 직전 대비 변화량 (delta는 텍스트 이벤트 예약어)
  | { type: "done"; waitingForUser?: boolean };

export interface SearchFilters {
  q?: string;
  province?: string;
  sex?: string;
  ageMin?: number;
  ageMax?: number;
  occupation?: string;
  page?: number;
  limit?: number;
}
