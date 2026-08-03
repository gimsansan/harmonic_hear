# 하모니튠 (HarmoniTune) — 단계별 구현 계획서

명세서 전체를 **6단계**로 나누고, 각 단계마다 빌드/실행 검증 후 다음으로 넘어갑니다.

---

## Phase 1: 프로젝트 기반 세팅 (§2)

**목표:** Expo 프로젝트가 빈 화면이라도 정상 빌드·실행되는 상태 확보

#### [NEW] [index.ts](file:///d:/hamornic_hear/index.ts)
- Expo Router 진입점

#### [NEW] [app/_layout.tsx](file:///d:/hamornic_hear/app/_layout.tsx)
- 루트 레이아웃 (다크 테마 배경 `#12131C`, StatusBar 설정)

#### [NEW] [app/index.tsx](file:///d:/hamornic_hear/app/index.tsx)
- 홈 화면 (간단한 타이틀 + 훈련 시작 버튼)

#### [NEW] [tsconfig.json](file:///d:/hamornic_hear/tsconfig.json)
- TypeScript 설정

#### [NEW] [babel.config.js](file:///d:/hamornic_hear/babel.config.js)
- Babel 설정 (Reanimated 플러그인 포함)

### ✅ 검증
- `npx expo start --dev-client` → 앱 빌드 성공 + 빈 홈 화면 렌더링 확인

---

## Phase 2: 오디오 엔진 핵심 로직 (§4.1, §4.4, §5, §6)

**목표:** 소리가 실제로 나는 것을 확인 (UI 없이 로직만)

#### [NEW] [src/audio/AudioEngine.ts](file:///d:/hamornic_hear/src/audio/AudioEngine.ts)
- `AudioContext` 생명주기 관리
- `playTone(freq, duration, mode)` — Sine / Sawtooth+Formant 분기
- GainNode Envelope (클릭/팝 방지)

#### [NEW] [src/audio/pitchUtils.ts](file:///d:/hamornic_hear/src/audio/pitchUtils.ts)
- `centsToFreq(baseHz, cents)` — Hz↔cent 변환
- `freqToCents(baseHz, targetHz)` — 역변환
- `calcCoupledDuration(originalMs, detuneCents)` — §5.2 재생 길이 커플링 보정

#### [NEW] [src/audio/keyzoneUtils.ts](file:///d:/hamornic_hear/src/audio/keyzoneUtils.ts)
- `findNearestSample(targetHz, sampleMap)` — §12 최근접 키존 선택
- `calcDetune(targetHz, sampleHz)` — detune cent 계산 (±100 cent 상한 검증)
- 샘플 맵 타입 정의 (나중에 실제 파일 연결용)

#### [NEW] [src/training/StaircaseEngine.ts](file:///d:/hamornic_hear/src/training/StaircaseEngine.ts)
- §6 적응형 난이도 로직
  - 연속 2회 정답 → 격차 10 cent 감소 (최소 10)
  - 오답 → streak 리셋 + 격차 10 cent 증가 (최대 150)
- 상태: `centsDifference`, `streak`, `isHigher`, `totalTrials`, `correctCount`

### ✅ 검증
- `react-native-audio-api` 설치 확인
- 앱에서 테스트 버튼 → Sine 음 재생 확인
- 콘솔 로그로 Staircase 로직 정상 동작 확인

---

## Phase 3: 음고 훈련 화면 UI (§7, §8)

**목표:** 명세서 §7 와이어프레임대로 훈련 화면 완성

#### [NEW] [src/constants/theme.ts](file:///d:/hamornic_hear/src/constants/theme.ts)
- 디자인 토큰 정의 (Background `#12131C`, Primary `#00E5FF`, Secondary `#FF6D00`, Success `#00E676`, Error `#FF5252`)
- 폰트, 간격, 반지름 등

#### [NEW] [app/training.tsx](file:///d:/hamornic_hear/app/training.tsx)
- 음고 훈련 메인 화면
- 모드 탭 (🌊 순수 파형 / 🎤 사람 목소리)
- 정보 뱃지 (격차 Cents, 연속 정답)
- 시각화 캔버스 (소리 A/B 표시)
- 재생 버튼
- 높음/낮음 답변 버튼
- 피드백 표시

#### [NEW] [src/components/WaveVisualizer.tsx](file:///d:/hamornic_hear/src/components/WaveVisualizer.tsx)
- Animated API 기반 파형 시각화 (소리 A/B 개별 애니메이션)
- 활성 상태에 따른 색상 전환 (시안/오렌지)

#### [NEW] [src/components/ModeTab.tsx](file:///d:/hamornic_hear/src/components/ModeTab.tsx)
- 모드 선택 탭 컴포넌트

#### [NEW] [src/components/AnswerButtons.tsx](file:///d:/hamornic_hear/src/components/AnswerButtons.tsx)
- 높음/낮음 답변 버튼 + 비활성 상태 처리

#### [NEW] [src/components/FeedbackCard.tsx](file:///d:/hamornic_hear/src/components/FeedbackCard.tsx)
- 정답/오답 피드백 카드 (초록/빨강 테두리)

### ✅ 검증
- 훈련 화면 렌더링 확인
- 모드 전환 동작
- 소리 재생 → 애니메이션 연동
- 답변 → 피드백 표시 → 난이도 변화 확인

---

## Phase 4: 평가/훈련 이원화 + 세션 관리 (§4.3)

**목표:** 평가 모드와 훈련 모드가 분리되어 동작

#### [NEW] [src/training/SessionManager.ts](file:///d:/hamornic_hear/src/training/SessionManager.ts)
- 평가(Assessment) / 훈련(Training) 모드 전환 관리
- 평가 모드: shift = 0 (직접 녹음 재생, 포먼트 변형 0%)
- 훈련 모드: 키존 보간 + detune
- 세션 결과 기록 (정답률, 반응시간, 시행 수)

#### [NEW] [src/storage/TrainingStorage.ts](file:///d:/hamornic_hear/src/storage/TrainingStorage.ts)
- AsyncStorage 기반 훈련 결과 저장/조회
- 세션 히스토리, 최소 달성 cent 격차 등

#### [MODIFY] [app/training.tsx](file:///d:/hamornic_hear/app/training.tsx)
- 평가/훈련 모드 선택 UI 추가
- 반응시간 측정 로직 추가

### ✅ 검증
- 평가 모드에서 shift = 0 확인
- 훈련 모드에서 Staircase 정상 동작
- AsyncStorage 저장/불러오기 확인

---

## Phase 5: Skia 시각화 업그레이드 (§2, §7)

**목표:** Animated API → @shopify/react-native-skia GPU 가속 시각화 전환

#### [NEW] [src/components/SkiaWaveVisualizer.tsx](file:///d:/hamornic_hear/src/components/SkiaWaveVisualizer.tsx)
- Skia Canvas 기반 실시간 파형 렌더링
- 소리 A/B 개별 파형 (시안/오렌지 그라디언트)
- 재생 중 부드러운 애니메이션 (목표 60fps)

#### [MODIFY] [app/training.tsx](file:///d:/hamornic_hear/app/training.tsx)
- `WaveVisualizer` → `SkiaWaveVisualizer` 교체

### ✅ 검증
- Skia 캔버스 렌더링 확인
- 재생 시 파형 애니메이션 부드러움 확인
- 성능 프로파일링 (60fps 목표)

---

## Phase 6: 통계/결과 화면 + 최종 다듬기 (§11)

**목표:** 사용자 데이터 시각화 + 전체 UX 마무리

#### [NEW] [app/stats.tsx](file:///d:/hamornic_hear/app/stats.tsx)
- 훈련 통계 화면 (세션별 최소 cent 격차, 정답률 추이)
- Skia 기반 차트/그래프

#### [NEW] [app/settings.tsx](file:///d:/hamornic_hear/app/settings.tsx)
- 설정 화면 (기준음 변경, 훈련 모드 기본값 등)

#### [MODIFY] [app/_layout.tsx](file:///d:/hamornic_hear/app/_layout.tsx)
- 하단 탭 네비게이션 추가 (훈련 / 통계 / 설정)

### ✅ 검증
- 전체 네비게이션 흐름 확인
- 통계 데이터 정상 표시
- 앱 전체 사용 시나리오 테스트

---

## 진행 방식

> [!IMPORTANT]
> **각 Phase 완료 시 빌드 확인 → 문제 없으면 다음 Phase 진행.**
> Phase 간에 결과를 보여드리고 확인받습니다.

## 전체 구조 미리보기

```
d:\hamornic_hear\
├── app/
│   ├── _layout.tsx          # 루트 레이아웃
│   ├── index.tsx            # 홈 화면
│   ├── training.tsx         # 음고 훈련 화면
│   ├── stats.tsx            # 통계 화면
│   └── settings.tsx         # 설정 화면
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts   # 오디오 엔진
│   │   ├── pitchUtils.ts    # Hz↔cent 변환
│   │   └── keyzoneUtils.ts  # 키존 선택 로직
│   ├── training/
│   │   ├── StaircaseEngine.ts  # 적응형 난이도
│   │   └── SessionManager.ts  # 세션 관리
│   ├── storage/
│   │   └── TrainingStorage.ts  # 데이터 저장
│   ├── components/
│   │   ├── WaveVisualizer.tsx
│   │   ├── SkiaWaveVisualizer.tsx
│   │   ├── ModeTab.tsx
│   │   ├── AnswerButtons.tsx
│   │   └── FeedbackCard.tsx
│   └── constants/
│       └── theme.ts         # 디자인 토큰
├── assets/
│   └── images/
├── index.ts
├── app.json
├── package.json
├── tsconfig.json
└── babel.config.js
```

## Open Questions

> [!IMPORTANT]
> **react-native-audio-api 설치 방식**: 이 패키지는 native 모듈이라 `expo prebuild` 후 dev client로 실행해야 합니다. 현재 Android 기기/에뮬레이터가 준비되어 있나요?

> [!NOTE]
> Phase 1부터 시작해서 각 단계 완료될 때마다 확인하고 넘어가는 방식으로 진행합니다. 문제 발생 시 즉시 해당 단계에서 수정합니다.
