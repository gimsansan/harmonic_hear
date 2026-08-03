# Phase 2: 오디오 엔진 핵심 로직 — 보고서

## 계획
- AudioEngine: Sine/Voice(포먼트합성) 두 모드 지원
- pitchUtils: Hz↔cent 변환, 재생 길이 커플링 보정
- keyzoneUtils: 최근접 키존 샘플 선택 + detune 계산 (§12)
- StaircaseEngine: 적응형 계단법 난이도 엔진 (§6)
- 디자인 토큰(theme.ts): 색상, 오디오, 난이도, 키존 상수 중앙 관리

## 생성된 파일

| 파일 | 역할 | 명세서 섹션 |
|------|------|------------|
| `src/constants/theme.ts` | 디자인 토큰 + 오디오/난이도/키존 상수 | §7, §6, §4.2, §5 |
| `src/audio/pitchUtils.ts` | Hz↔cent 변환, 커플링 보정 | §5, §12 |
| `src/audio/keyzoneUtils.ts` | 키존 샘플 선택, detune 계산, 기본 샘플 맵 | §4.2, §12 |
| `src/audio/AudioEngine.ts` | Sine/Voice 톤 재생, GainNode Envelope | §4.1, §4.4, §8 |
| `src/training/StaircaseEngine.ts` | 적응형 난이도 로직 | §6 |

## 핵심 구현 사항

### AudioEngine
- `playSineTone()`: OscillatorNode('sine') + exponentialRamp Envelope
- `playVoiceTone()`: OscillatorNode('sawtooth') + BiquadFilter(F1=800, F2=1200, Q=3.0)
- 클릭/팝 방지: Attack 50ms, Release 50ms

### pitchUtils
- `centsToFreq(440, 100)` → 466.16Hz (A4 → A#4)
- `calcCoupledDuration(1000, 100)` → 943.87ms (−5.61%, §5.2 검증 수치 일치)

### keyzoneUtils
- 기본 샘플 맵: C3~C5, 200 cent(온음) 간격 13개 샘플
- `findNearestSample()`: ±100 cent 상한 검증 포함
- 실제 녹음 파일은 아직 없음 → `source` 필드 나중에 연결

### StaircaseEngine
- 연속 2회 정답 → 격차 10 cent 감소 (최소 10)
- 오답 → streak 리셋 + 격차 10 cent 증가 (최대 150)
- streak 달성 후 자동 리셋 (0으로)

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| TypeScript 컴파일 (`tsc --noEmit`) | ✅ 에러 0개 |
| Expo 번들링 (`expo export --platform android`) | ✅ 성공 (2.6MB) |

## 다음 단계
→ **Phase 3: 음고 훈련 화면 UI** (WaveVisualizer, ModeTab, AnswerButtons, FeedbackCard, training.tsx)
