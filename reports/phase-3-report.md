# Phase 3: 음고 훈련 화면 UI — 보고서

## 계획
- ModeTab, WaveVisualizer, AnswerButtons, FeedbackCard 컴포넌트 완성
- training.tsx에서 Phase 2 엔진(AudioEngine + StaircaseEngine) 통합
- 명세서 §7 와이어프레임 구현

## 생성/수정된 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `src/components/ModeTab.tsx` | 모드 전환 탭 (wave/voice) | Phase 2에서 생성 |
| `src/components/WaveVisualizer.tsx` | 파형 시각화 (5개 바 애니메이션) | Phase 2에서 생성 |
| `src/components/AnswerButtons.tsx` | 높음/낮음 답변 버튼 | 신규 |
| `src/components/FeedbackCard.tsx` | 정답/오답 피드백 카드 (fade-in + slide-up) | 신규 |
| `app/training.tsx` | 훈련 화면 전체 (엔진+컴포넌트 통합) | 플레이스홀더 → 완전 교체 |

## 핵심 구현 사항

### training.tsx — 엔진 통합
- `AudioEngine` + `StaircaseEngine`을 `useRef`로 인스턴스 유지
- 동작 시퀀스: A(440Hz) 1.0s → 대기 0.5s → B(비교) 1.0s → 답변 대기
- GameState: `idle` → `playing` → `waiting` → `answered`
- 타이머 정리: unmount 시 `clearTimeout` 자동 처리

### WaveVisualizer
- 5개 바가 각각 다른 높이로 맥동 (0.6, 0.9, 1.2, 0.9, 0.6)
- Easing.bezier로 자연스러운 곡선
- A=시안, B=오렌지, 비활성=회색

### FeedbackCard
- fade-in(opacity 0→1) + slide-up(Y +20→0) 등장 애니메이션
- 정답=초록 테두리+반투명 배경, 오답=빨강

### AnswerButtons
- 재생 중(playing) + 아이들(idle) 상태에서 비활성화
- waiting/answered 상태에서만 활성

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| TypeScript 컴파일 (`tsc --noEmit`) | ✅ 에러 0개 |
| Expo 번들링 (`expo export --platform android`) | ✅ 성공 (3.9MB) |

## 다음 단계
→ **Phase 4: 평가/훈련 이원화 + 세션 관리** (SessionManager, TrainingStorage)
